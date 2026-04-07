# Plateforme de surveillance de santé à distance et assistance au diagnostic basée sur l'IA

## Description du projet

Plateforme web et mobile permettant aux utilisateurs de surveiller à distance leurs paramètres de santé vitaux (fréquence cardiaque, pression artérielle, niveaux d'oxygène) à l'aide de dispositifs intelligents ou de saisies manuelles, et de recevoir des recommandations diagnostiques pilotées par l'IA. Utilisable par les professionnels de santé pour le suivi des patients ou par les particuliers pour l'auto-surveillance.

## Problématique (WHY)

Le système de santé est submergé, entraînant des retards dans les diagnostics et les traitements, notamment en zones rurales ou sous-desservies. Les patients n'ont souvent pas accès à une surveillance immédiate de leur santé, ce qui pourrait prévenir l'aggravation de certaines conditions.

## Contexte technique (HOW)

- **Collecte** : données issues de dispositifs portables ou d'entrées manuelles (IoT, saisie utilisateur).
- **Analyse** : modèles d'apprentissage automatique pour détecter anomalies et risques.
- **Actions** : alertes aux utilisateurs et professionnels, recommandations (consultation, ajustements de mode de vie).
- **Architecture** : microservices (gestion utilisateurs, traitement des données de santé, inférences IA, notifications).

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Frontend Web | React.js |
| Frontend Mobile | React Native |
| Backend | Python (FastAPI) – API RESTful |
| IA/ML | Modèles de détection d'anomalies (classification/régression) |
| Base de données | PostgreSQL (données structurées, profils) + MongoDB (données de santé non structurées) |
| Conteneurs | Docker, Kubernetes |
| CI/CD | GitHub Actions |
| Cloud | AWS (EC2, S3, Lambda, API Gateway) ou Azure (App Services, Blob Storage) |
| Données / Analytics | Snowflake (optionnel, à grande échelle) |

## Structure du dépôt

```
health-monitoring-platform/
├── docs/                    # Documentation (UML, ER, spécifications)
├── frontend-web/            # Application web React
├── frontend-mobile/        # Application mobile React Native
├── services/
│   ├── api-gateway/        # Passerelle API (routage, auth)
│   ├── user-service/       # Gestion utilisateurs (PostgreSQL)
│   ├── health-data-service/# Données de santé (MongoDB)
│   ├── ai-inference-service/# Inférence IA/ML
│   └── notification-service/# Alertes et notifications
├── ml-training/             # Scripts d'entraînement des modèles
├── infrastructure/          # Docker, Kubernetes, déploiement
└── README.md
```

## Prérequis

- Node.js 18+, Python 3.10+, Docker, kubectl (pour K8s)
- PostgreSQL 14+, MongoDB 6+
- Compte AWS ou Azure pour le déploiement

## Démarrage rapide (développement local)

```bash
# Avec Docker Compose (tous les services)
cd infrastructure
docker-compose up -d

# Frontend web
cd frontend-web && npm install && npm run dev

# Backend (ex. user-service)
cd services/user-service && pip install -r requirements.txt && uvicorn main:app --reload
```

## Sécurité et conformité

- Chiffrement AES-256 (données au repos et en transit)
- RBAC (contrôle d'accès basé sur les rôles)
- Anonymisation des données, conformité HIPAA/GDPR selon région de déploiement

## Livrables

- [x] Documentation (cas d'utilisation, classes, activités, séquence, ER)
- [x] Frontend web et mobile responsive
- [x] Backend microservices avec analytique IA
- [x] Configuration hybride SQL/NoSQL
- [x] UC3: Historique des mesures (page + endpoint /vitals/history)
- [x] UC4: Alertes automatiques (seuils, type, severity conforme ER)
- [x] UC6: Évaluations de risque IA intégrées au dashboard (séquence HDS→AI→RiskAssessment)
- [ ] Solution déployée sur le cloud
- [ ] Projet versionné sur GitHub/GitLab avec pipelines CI/CD
- [ ] Documentation d'entraînement des modèles et rapports de tests

## Licence

Projet académique / interne. À adapter selon votre contexte.
