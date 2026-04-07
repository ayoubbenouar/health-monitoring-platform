# Description du projet – Surveillance de santé à distance et assistance au diagnostic (IA)

## 1. Vue d'ensemble

La plateforme assure la **surveillance à distance des paramètres vitaux** (fréquence cardiaque, pression artérielle, SpO2) et fournit une **assistance au diagnostic** via des modèles d’apprentissage automatique. Elle s’adresse aux **professionnels de santé** (suivi des patients) et aux **particuliers** (auto-surveillance).

## 2. Objectifs

- Réduire les retards de diagnostic et de prise en charge.
- Offrir une surveillance continue et des alertes en temps (quasi) réel.
- Proposer des recommandations basées sur l'IA (consultation, ajustements du mode de vie).
- Garantir la confidentialité et la sécurité des données de santé (HIPAA/GDPR).

## 3. Acteurs

| Acteur | Rôle |
|--------|------|
| Patient / Utilisateur | Saisie ou envoi de données (manuelles ou via dispositifs), consultation des tableaux de bord et alertes. |
| Professionnel de santé | Suivi des patients, consultation des historiques, gestion des alertes. |
| Administrateur | Gestion des comptes, des rôles et de la conformité. |
| Système (IA) | Analyse des données, détection d’anomalies, génération de recommandations. |

## 4. Flux principaux

1. **Collecte** : Données issues de wearables, IoT ou saisie manuelle → validation et enregistrement.
2. **Traitement** : Agrégation, nettoyage, règles métier (plages normales, incohérences).
3. **Inférence IA** : Classification / régression des risques, intervalles de confiance.
4. **Alertes et recommandations** : Notifications aux utilisateurs et aux professionnels, suggestions d’actions.
5. **Visualisation** : Tableaux de bord web et mobile, historique des mesures.

## 5. Contraintes techniques

- Microservices : séparation claire entre utilisateurs, données de santé, IA et notifications.
- Données : PostgreSQL (profils, métadonnées), MongoDB (données de santé brutes et dérivées).
- Sécurité : chiffrement (AES-256), RBAC, audit des accès.
- Scalabilité : conteneurs Docker, orchestration Kubernetes, scaling automatique.
