# Rapport d'entraînement du modèle – Classification du risque santé

## 1. Objectif

Entraîner un modèle de classification du niveau de risque (faible / modéré / élevé) à partir des signes vitaux (fréquence cardiaque, pression artérielle systolique/diastolique, SpO2) pour alimenter le service **ai-inference-service**.

## 2. Jeu de données

| Élément | Détail |
|--------|--------|
| Source | Données synthétiques (générées par `model_loader._train_default_model` et `ml-training/scripts/train_example.py`) |
| Raison | Reproductibilité et conformité : pas de données personnelles ; les seuils sont alignés avec les recommandations médicales (HTA ≥140/90 mmHg, SpO2 < 92 %). |
| Référence pour production | UCI Heart Disease, PhysioNet, ou jeux similaires (voir `ml-training/README.md`). |
| Taille (exemple) | 2000 échantillons (train) |
| Features | heart_rate, blood_pressure_systolic, blood_pressure_diastolic, spo2 |
| Labels | 0 = low, 1 = moderate (tension élevée), 2 = high (SpO2 bas ou tension) |

## 3. Méthode

- **Modèle** : RandomForestClassifier (scikit-learn), n_estimators=100, random_state=42.
- **Prétraitement** : Aucune normalisation (valeurs dans plages physiologiques).
- **Découpage** : 100 % train pour le modèle par défaut (créé au démarrage du service) ; dans `train_example.py`, split 80/20 possible via `--test-size`.

## 4. Métriques (exemple – run train_example.py)

| Métrique | Valeur typique |
|----------|----------------|
| Accuracy | ~0.95–1.0 (données synthétiques) |
| F1 (weighted) | ~0.95–1.0 |
| Matrice de confusion | Dépend du seed et du split |

Les métriques détaillées sont écrites dans `ml-training/models/metrics_v1.json` après exécution de :

```bash
cd ml-training && pip install -r requirements.txt && python scripts/train_example.py --output-dir models
```

## 5. Export et version

| Élément | Valeur |
|--------|--------|
| Format | joblib (scikit-learn) |
| Fichier | `risk_classifier_v1.joblib` |
| Version modèle | v1-default (créé au démarrage) ou v1-trained (chargé depuis disque) |
| Intégration | Le service `ai-inference-service` charge le modèle au démarrage (`model_loader.load_or_create_model`) ou entraîne et enregistre un modèle par défaut si absent. |

## 6. Conformité et limites

- Données synthétiques : pas de données personnelles ; adapté à la démo et aux tests.
- Pour un usage clinique : entraîner sur des jeux médicaux documentés, valider les métriques (sensibilité/spécificité par classe) et respecter les normes (HIPAA, GDPR, bonnes pratiques).
