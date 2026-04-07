"""
Health Data Service - Vital records, validation, dashboard aggregation.
MongoDB for vitals and related health data.
Conforme à l'énoncé: collecte → traitement → inférence IA → alertes.
"""
import httpx
from fastapi import FastAPI, HTTPException, Header, Depends
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Tuple
from motor.motor_asyncio import AsyncIOMotorClient
import os

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_DB", "health_data")
AI_INFERENCE_URL = os.getenv("AI_INFERENCE_SERVICE_URL", "http://localhost:8003")

client = AsyncIOMotorClient(MONGO_URI)
db = client[DB_NAME]
vitals_coll = db["vital_records"]
alerts_coll = db["alerts"]
risk_assessments_coll = db["risk_assessments"]

app = FastAPI(title="Health Data Service")

# --- Validation ranges (simplified) ---
VITAL_RANGES = {
    "heart_rate": (30, 220),
    "blood_pressure_systolic": (70, 250),
    "blood_pressure_diastolic": (40, 150),
    "spo2": (70, 100),
    "temperature": (35.0, 42.0),
}

# --- Seuils pour alertes (conforme ER: type, severity, message) ---
def _check_alert(vital_type: str, value: float) -> Optional[Tuple[str, str, str]]:
    """Retourne (message, type, severity) si seuil dépassé, sinon None."""
    if vital_type == "heart_rate":
        if value > 100:
            return (f"Fréquence cardiaque élevée ({value} bpm). Surveillance recommandée.", "heart_rate_high", "moderate")
        if value < 50:
            return (f"Fréquence cardiaque basse ({value} bpm). Surveillance recommandée.", "heart_rate_low", "moderate")
    elif vital_type == "blood_pressure_systolic":
        if value >= 140:
            return (f"Pression systolique élevée ({value} mmHg). Consultation si persistant.", "blood_pressure", "moderate")
    elif vital_type == "blood_pressure_diastolic":
        if value >= 90:
            return (f"Pression diastolique élevée ({value} mmHg). Consultation si persistant.", "blood_pressure", "moderate")
    elif vital_type == "spo2":
        if value < 92:
            return (f"SpO2 basse ({value} %). Consulter un médecin, vérifier saturation.", "spo2_low", "high")
    elif vital_type == "temperature":
        if value >= 38.0:
            return (f"Fièvre ({value} °C). Surveillance, consultation si persistant.", "fever", "moderate")
        if value < 35.5:
            return (f"Température basse ({value} °C). Surveillance recommandée.", "hypothermia", "moderate")
    return None

class VitalEntry(BaseModel):
    type: str = Field(..., description="heart_rate | blood_pressure_systolic | blood_pressure_diastolic | spo2 | temperature")
    value: float
    unit: Optional[str] = None
    source: Optional[str] = "manual"
    device_id: Optional[str] = None

class VitalRecordResponse(BaseModel):
    id: str
    patient_id: str
    type: str
    value: float
    unit: Optional[str]
    timestamp: datetime
    source: str
    validated: bool

def get_user_id(x_user_id: Optional[str] = Header(None)):
    if not x_user_id:
        raise HTTPException(401, "Missing X-User-Id")
    return x_user_id


async def _get_latest_vitals_by_type(patient_id: str) -> dict:
    """Dernière valeur de chaque type de vital pour l'appel AI /predict."""
    pipeline = [
        {"$match": {"patient_id": patient_id}},
        {"$sort": {"timestamp": -1}},
        {"$group": {"_id": "$type", "value": {"$first": "$value"}}},
    ]
    cursor = vitals_coll.aggregate(pipeline)
    out = {}
    async for row in cursor:
        t = row["_id"]
        v = row["value"]
        if t == "heart_rate":
            out["heart_rate"] = v
        elif t == "blood_pressure_systolic":
            out["blood_pressure_systolic"] = v
        elif t == "blood_pressure_diastolic":
            out["blood_pressure_diastolic"] = v
        elif t == "spo2":
            out["spo2"] = v
        elif t == "temperature":
            out["temperature"] = v
    return out

@app.post("/vitals", response_model=VitalRecordResponse)
async def create_vital(entry: VitalEntry, patient_id: str = Depends(get_user_id)):
    if entry.type not in VITAL_RANGES:
        raise HTTPException(400, f"Unknown vital type: {entry.type}")
    lo, hi = VITAL_RANGES[entry.type]
    if not (lo <= entry.value <= hi):
        raise HTTPException(400, f"Value out of range [{lo}, {hi}]")
    doc = {
        "patient_id": patient_id,
        "type": entry.type,
        "value": entry.value,
        "unit": entry.unit,
        "timestamp": datetime.utcnow(),
        "source": entry.source or "manual",
        "device_id": entry.device_id,
        "validated": True,
    }
    r = await vitals_coll.insert_one(doc)
    doc["id"] = str(r.inserted_id)

    # Création d'alerte automatique si seuil dépassé (conforme ER: type, severity)
    alert_result = _check_alert(entry.type, entry.value)
    if alert_result:
        msg, atype, severity = alert_result
        await alerts_coll.insert_one({
            "patient_id": patient_id,
            "type": atype,
            "severity": severity,
            "message": msg,
            "vital_type": entry.type,
            "value": entry.value,
            "vital_id": doc["id"],
            "timestamp": datetime.utcnow(),
            "acknowledged": False,
        })

    # Séquence conforme: HDS -> AI après mesure -> persister RiskAssessment
    try:
        latest_by_type = await _get_latest_vitals_by_type(patient_id)
        async with httpx.AsyncClient(timeout=10.0) as client_http:
            resp = await client_http.post(
                f"{AI_INFERENCE_URL.rstrip('/')}/predict",
                json=latest_by_type,
                headers={"X-User-Id": patient_id},
            )
            if resp.status_code == 200:
                data = resp.json()
                await risk_assessments_coll.insert_one({
                    "patient_id": patient_id,
                    "risk_level": data.get("risk_level", "low"),
                    "confidence": data.get("confidence", 0),
                    "factors": data.get("factors", []),
                    "recommendations": data.get("recommendations", []),
                    "model_version": data.get("model_version", ""),
                    "created_at": datetime.utcnow(),
                })
    except Exception:
        pass  # Ne pas bloquer la réponse si l'IA est indisponible

    return VitalRecordResponse(
        id=doc["id"],
        patient_id=doc["patient_id"],
        type=doc["type"],
        value=doc["value"],
        unit=doc.get("unit"),
        timestamp=doc["timestamp"],
        source=doc["source"],
        validated=doc["validated"],
    )

@app.get("/vitals/latest", response_model=List[dict])
async def get_latest_vitals(patient_ids: Optional[str] = None, x_user_id: Optional[str] = Header(None)):
    # In real app: resolve patient_ids from role (practitioner sees many; patient sees self)
    pid = patient_ids.split(",") if patient_ids else [x_user_id]
    if not pid:
        raise HTTPException(400, "patient_ids or X-User-Id required")
    pipeline = [
        {"$match": {"patient_id": {"$in": pid}}},
        {"$sort": {"timestamp": -1}},
        {"$group": {"_id": "$patient_id", "docs": {"$push": "$$ROOT"}}},
        {"$project": {"latest": {"$slice": ["$docs", 5]}}},
    ]
    cursor = vitals_coll.aggregate(pipeline)
    out = []
    async for g in cursor:
        for d in g.get("latest", []):
            d["id"] = str(d.pop("_id"))
            out.append(d)
    return out[:50]

@app.get("/dashboard")
async def dashboard(patient_ids: Optional[str] = None, x_user_id: Optional[str] = Header(None)):
    pids = [x_user_id] if not patient_ids else [x for x in patient_ids.split(",") if x]
    pids = [p for p in pids if p]
    if not pids:
        return {"vitals": [], "alerts": [], "risk_assessments": []}
    latest = await get_latest_vitals(patient_ids=",".join(pids), x_user_id=x_user_id)
    cursor = alerts_coll.find({"patient_id": {"$in": pids}, "acknowledged": False}).limit(20)
    alerts = []
    async for a in cursor:
        a["id"] = str(a.pop("_id"))
        alerts.append(a)
    # UC6: Rapports et risques IA (conforme diagramme séquence)
    cursor_ra = risk_assessments_coll.find({"patient_id": {"$in": pids}}).sort("created_at", -1).limit(10)
    risk_assessments = []
    async for ra in cursor_ra:
        ra["id"] = str(ra.pop("_id"))
        risk_assessments.append(ra)
    return {"vitals": latest, "alerts": alerts, "risk_assessments": risk_assessments}


@app.get("/vitals/history", response_model=List[dict])
async def get_vitals_history(
    limit: int = 50,
    patient_ids: Optional[str] = None,
    x_user_id: Optional[str] = Header(None),
):
    """UC3: Historique complet des mesures (paginated)."""
    pids = [x_user_id] if not patient_ids else [x for x in patient_ids.split(",") if x]
    pids = [p for p in pids if p]
    if not pids:
        raise HTTPException(400, "patient_ids or X-User-Id required")
    cursor = (
        vitals_coll.find({"patient_id": {"$in": pids}})
        .sort("timestamp", -1)
        .limit(min(limit, 200))
    )
    out = []
    async for d in cursor:
        d["id"] = str(d.pop("_id"))
        out.append(d)
    return out

@app.get("/health")
async def health():
    return {"status": "ok", "service": "health-data-service"}
