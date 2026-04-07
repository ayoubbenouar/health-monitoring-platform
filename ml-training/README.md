# Entraînement des modèles IA – Surveillance de santé

## Objectif

Entraîner des modèles de détection d'anomalies et de classification des risques à partir de jeux de données médicaux (tension, fréquence cardiaque, SpO2, etc.) pour alimenter le service **ai-inference-service**.

## Jeux de données recommandés

- **Hypertension / tension** : [UCI Blood Transfusion](https://archive.ics.uci.edu/dataset/101/blood+transfusion+service+center), [MIMIC-III](https://physionet.org/content/mimiciii/) (accès contrôlé), ou jeux ouverts type [Heart Disease](https://archive.ics.uci.edu/dataset/45/heart+disease).
- **Signes vitaux généraux** : [PhysioNet](https://physionet.org/) (multiples datasets), [Vital Signs](https://www.kaggle.com/datasets) (Kaggle).
- **SpO2 / respiration** : jeux de données polysomnographie ou soins intensifs (selon conformité et licence).

Choisir des jeux **ouverts, documentés et conformes** à l'usage prévu (recherche / démo ; pour production, conformité réglementaire requise).

## Pipeline d'entraînement (exemple)

1. **Chargement et prétraitement**
   - Nettoyage des valeurs manquantes et aberrantes.
   - Normalisation des plages (min-max ou z-score) selon les variables.
   - Découpage train / validation / test (ex. 70 / 15 / 15).

2. **Modèles possibles**
   - **Régression** : prédiction de valeurs continues (ex. tension artérielle).
   - **Classification** : risque binaire ou multi-classe (ex. risque faible / modéré / élevé).
   - **Détection d'anomalies** : Isolation Forest, One-Class SVM, ou autoencodeurs sur séries temporelles.

3. **Métriques**
   - Classification : accuracy, F1, courbe ROC-AUC, matrice de confusion.
   - Régression : MAE, RMSE, R².
   - Documenter les intervalles de confiance ou incertitudes si disponibles.

4. **Export du modèle**
   - Sauvegarder le modèle (ex. `joblib`, `pickle`, ou format ONNX) et la version du jeu de données.
   - Documenter les features en entrée et la version du pipeline (pour reproductibilité).

## Structure suggérée

```
ml-training/
├── README.md                 # Ce fichier
├── data/                     # Données brutes (ne pas versionner les données sensibles)
│   └── .gitkeep
├── notebooks/                # Jupyter pour exploration et entraînement
│   └── train_risk_classifier.ipynb
├── scripts/
│   ├── preprocess.py         # Nettoyage et préparation
│   ├── train.py              # Entraînement (CLI)
│   └── export_model.py       # Export pour le service d'inférence
├── models/                   # Modèles exportés (versionnés ou stockés ailleurs)
│   └── .gitkeep
└── requirements.txt
```

## Intégration avec ai-inference-service

- Le service d'inférence charge le modèle exporté au démarrage (ou à la demande).
- Les entrées du modèle doivent correspondre aux champs reçus par l'API (heart_rate, blood_pressure_systolic, blood_pressure_diastolic, spo2, etc.).
- Documenter la version du modèle et le jeu d'entraînement dans les réponses (ex. `model_version`, `training_dataset_version`).

## Conformité et éthique

- Ne pas utiliser de données personnelles identifiantes sans base légale et anonymisation.
- Pour un usage clinique ou commercial : respecter les normes (HIPAA, GDPR, réglementations locales) et les bonnes pratiques (validation clinique, traçabilité).
