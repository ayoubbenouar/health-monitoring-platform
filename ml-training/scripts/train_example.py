"""
Example training script - Risk classification from vital signs.
Uses synthetic data for illustration; replace with real medical datasets.
"""
import argparse
import json
from pathlib import Path

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

def generate_synthetic_data(n_samples=2000, seed=42):
    """Generate synthetic vitals and risk labels for demo. Replace with real data loading."""
    rng = np.random.default_rng(seed)
    hr = rng.integers(50, 120, n_samples)
    bp_sys = rng.integers(90, 180, n_samples)
    bp_dia = rng.integers(60, 110, n_samples)
    spo2 = rng.integers(85, 100, n_samples)
    # Simple rule-based labels for demo
    risk = np.zeros(n_samples, dtype=int)
    risk[(bp_sys >= 140) | (bp_dia >= 90)] = 1
    risk[spo2 < 92] = 2
    X = np.column_stack([hr, bp_sys, bp_dia, spo2])
    y = risk
    return X, y

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", type=str, default="models")
    parser.add_argument("--test-size", type=float, default=0.2)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    X, y = generate_synthetic_data(seed=args.seed)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=args.test_size, random_state=args.seed, stratify=y
    )

    model = RandomForestClassifier(n_estimators=100, random_state=args.seed)
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    # Save model (use joblib in production)
    import joblib
    model_path = out_dir / "risk_classifier_v1.joblib"
    joblib.dump(model, model_path)
    print(f"Model saved to {model_path}")

    # Metrics
    metrics = {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "classification_report": classification_report(y_test, y_pred, output_dict=True),
        "feature_names": ["heart_rate", "blood_pressure_systolic", "blood_pressure_diastolic", "spo2"],
        "n_train": len(X_train),
        "n_test": len(X_test),
    }
    with open(out_dir / "metrics_v1.json", "w") as f:
        json.dump(metrics, f, indent=2)
    print("Metrics:", json.dumps(metrics, indent=2))

if __name__ == "__main__":
    main()
