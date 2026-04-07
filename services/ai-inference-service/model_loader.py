"""
Charge un modèle sklearn (joblib) pour la classification du risque.
Si aucun modèle n'est trouvé, entraîne un modèle par défaut (données synthétiques type médical).
"""
import os
from pathlib import Path

import numpy as np
import joblib
from sklearn.ensemble import RandomForestClassifier

MODEL_DIR = Path(os.getenv("MODEL_DIR", "/app/models"))
MODEL_FILENAME = "risk_classifier_v1.joblib"
FEATURE_NAMES = ["heart_rate", "blood_pressure_systolic", "blood_pressure_diastolic", "spo2"]
RISK_LABELS = ["low", "moderate", "high"]  # 0, 1, 2


def _train_default_model():
    """Entraîne un modèle par défaut (données synthétiques cohérentes avec les seuils médicaux)."""
    rng = np.random.default_rng(42)
    n = 2000
    hr = rng.integers(50, 120, n)
    bp_sys = rng.integers(90, 180, n)
    bp_dia = rng.integers(60, 110, n)
    spo2 = rng.integers(85, 100, n)
    risk = np.zeros(n, dtype=int)
    risk[(bp_sys >= 140) | (bp_dia >= 90)] = 1
    risk[spo2 < 92] = 2
    X = np.column_stack([hr, bp_sys, bp_dia, spo2])
    y = risk
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X, y)
    return model


def load_or_create_model():
    """Charge le modèle depuis le disque ou crée et enregistre un modèle par défaut."""
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    path = MODEL_DIR / MODEL_FILENAME
    if path.exists():
        return joblib.load(path), "v1-trained"
    model = _train_default_model()
    joblib.dump(model, path)
    return model, "v1-default"


_risk_model, _model_version = load_or_create_model()


def get_model_version():
    return _model_version


def predict_risk(heart_rate=None, bp_sys=None, bp_dia=None, spo2=None):
    """
    Prédit le niveau de risque (0=low, 1=moderate, 2=high) à partir des signes vitaux.
    Les valeurs manquantes sont remplacées par la médiane typique (70, 120, 80, 98).
    """
    defaults = (70.0, 120.0, 80.0, 98.0)
    features = [
        float(heart_rate) if heart_rate is not None else defaults[0],
        float(bp_sys) if bp_sys is not None else defaults[1],
        float(bp_dia) if bp_dia is not None else defaults[2],
        float(spo2) if spo2 is not None else defaults[3],
    ]
    X = np.array([features])
    pred = _risk_model.predict(X)[0]
    proba = _risk_model.predict_proba(X)[0]
    confidence = float(np.max(proba))
    return RISK_LABELS[pred], confidence
