"""
AI Inference Service - Risk assessment from vital signs.
Uses a pre-trained sklearn model (RandomForest) for risk classification.
Model is loaded from MODEL_DIR or trained at startup with synthetic medical-style data.
"""
from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from model_loader import predict_risk, get_model_version

app = FastAPI(title="AI Inference Service")
_model_version = get_model_version()


def _recommendations(risk_level: str, factors: List[str]) -> List[str]:
    rec = []
    if "low_spo2" in factors or risk_level == "high":
        rec.append("Consulter un médecin rapidement; vérifier saturation.")
    if "elevated_systolic_bp" in factors or "elevated_diastolic_bp" in factors:
        rec.append("Surveillance tension; consultation si persistant.")
    if "heart_rate_out_of_range" in factors:
        rec.append("Surveillance fréquence cardiaque; repos si besoin.")
    if risk_level == "low" and not factors:
        rec.append("Paramètres dans les normes. Continuer l'auto-surveillance.")
    return rec or ["Surveillance recommandée."]


def _factors(
    heart_rate: Optional[float],
    bp_sys: Optional[float],
    bp_dia: Optional[float],
    spo2: Optional[float],
) -> List[str]:
    factors = []
    if heart_rate is not None and (heart_rate > 100 or heart_rate < 50):
        factors.append("heart_rate_out_of_range")
    if bp_sys is not None and bp_sys >= 140:
        factors.append("elevated_systolic_bp")
    if bp_dia is not None and bp_dia >= 90:
        factors.append("elevated_diastolic_bp")
    if spo2 is not None and spo2 < 92:
        factors.append("low_spo2")
    return factors


class PredictRequest(BaseModel):
    heart_rate: Optional[float] = None
    blood_pressure_systolic: Optional[float] = None
    blood_pressure_diastolic: Optional[float] = None
    spo2: Optional[float] = None
    temperature: Optional[float] = None


@app.post("/predict")
async def predict(req: PredictRequest, x_user_id: Optional[str] = Header(None)):
    if not x_user_id:
        raise HTTPException(401, "Missing X-User-Id")
    risk_level, confidence = predict_risk(
        req.heart_rate,
        req.blood_pressure_systolic,
        req.blood_pressure_diastolic,
        req.spo2,
    )
    factors = _factors(
        req.heart_rate,
        req.blood_pressure_systolic,
        req.blood_pressure_diastolic,
        req.spo2,
    )
    recommendations = _recommendations(risk_level, factors)
    return {
        "patient_id": x_user_id,
        "risk_level": risk_level,
        "confidence": confidence,
        "factors": factors,
        "recommendations": recommendations,
        "model_version": _model_version,
        "created_at": datetime.utcnow().isoformat(),
    }


@app.get("/assessments/latest")
async def get_latest_assessments(patient_ids: Optional[str] = None, x_user_id: Optional[str] = Header(None)):
    return {"assessments": []}


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ai-inference-service", "model_version": _model_version}
