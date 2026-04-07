# Sécurité et confidentialité des données – Plateforme de surveillance de santé

## 1. Contexte réglementaire

- **HIPAA** (USA) et **RGPD** (Europe) s’appliquent aux données de santé.
- La plateforme vise la conformité via : authentification, RBAC, chiffrement (données au repos et en transit), audit et anonymisation selon le contexte de déploiement.

## 2. Mesures en place

| Mesure | Implémentation actuelle |
|--------|--------------------------|
| **Authentification** | JWT (HS256) émis par user-service, vérifié par api-gateway. |
| **RBAC** | Rôles `patient`, `practitioner`, `admin`. Praticiens accèdent aux seuls patients assignés (`GET /users/me/patients`, `POST /users/patients/assign`). |
| **Isolation des données** | Routes protégées par `X-User-Id` / `patient_ids` ; health-data-service et ai-inference n’exposent que les données du patient (ou des patients assignés au praticien). |
| **Validation des entrées** | Plages de signes vitaux (VITAL_RANGES) dans health-data-service ; rejet des valeurs aberrantes. |
| **Transit** | HTTPS à configurer en production (reverse proxy / load balancer). |

## 3. Chiffrement AES-256 (à mettre en œuvre en production)

### 3.1 Données en transit

- **TLS 1.2+** : activer HTTPS sur l’api-gateway et les services exposés (certificats côté reverse proxy, AWS ALB, Azure App Gateway, etc.).
- Les appels entre microservices (réseau interne Docker/K8s) peuvent rester en HTTP en environnement maîtrisé, ou être sécurisés par un maillage (mTLS) si requis.

### 3.2 Données au repos

- **Bases de données**
  - **PostgreSQL** : activer le chiffrement au repos (ex. chiffrement disque du volume, ou options fournies par le cloud : RDS encryption, Azure SQL TDE).
  - **MongoDB** : idem (chiffrement disque ou MongoDB Atlas encryption).
- **Champs sensibles applicatifs**
  - Pour aller au-delà du chiffrement disque : chiffrement côté application avec **AES-256** (ex. AES-256-GCM) pour les champs les plus sensibles.
  - Clés stockées dans un gestionnaire de secrets (AWS Secrets Manager, Azure Key Vault, HashiCorp Vault) et injectées via variables d’environnement.
  - Exemple de librairie Python : `cryptography` (Fernet ou AES-GCM). À appliquer avant écriture en base et après lecture.

### 3.3 Bonnes pratiques

- Ne jamais stocker les clés en clair dans le code ni dans le dépôt.
- Rotation des clés gérée par le secret manager.
- Anonymisation / pseudonymisation des données lorsque requis (analytics, entraînement de modèles).

## 4. Checklist déploiement production

- [ ] HTTPS (TLS) sur toutes les entrées utilisateur.
- [ ] JWT_SECRET et secrets DB dans un secret manager.
- [ ] Chiffrement au repos activé sur PostgreSQL et MongoDB.
- [ ] (Optionnel) Chiffrement applicatif AES-256 des champs sensibles + clés dans un secret manager.
- [ ] Audit des accès (logs, traçabilité des accès aux données santé).
- [ ] Politique de rétention et suppression des données conforme au RGPD/HIPAA.
