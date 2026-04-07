# Rapport de tests – Plateforme de surveillance de santé

## 1. Périmètre

- **API** : user-service, health-data-service, ai-inference-service, notification-service, api-gateway.
- **Frontend** : application web (React), application mobile (React Native / Expo).
- **Intégration** : flux complets (inscription → login → saisie de mesure → tableau de bord → prédiction), RBAC (praticien / patients assignés).

## 2. Environnement de test

| Élément       | Valeur |
|---------------|--------|
| Date          | 2026-03-08 |
| Environnement | Local (Docker Compose + frontend Vite) |
| Versions      | Node 18+, Python 3.11+, PostgreSQL 15, MongoDB 6 |

## 3. Tests unitaires (exemples)

| Module / service     | Scénario                          | Résultat attendu     | Statut |
|----------------------|-----------------------------------|----------------------|--------|
| user-service         | POST /auth/register (nouvel email)| 200, utilisateur créé| OK (manuel) |
| user-service         | POST /auth/login (identifiants ok) | 200, JWT retourné    | OK (manuel) |
| user-service         | GET /users/me/patients (praticien)| 200, patient_ids [] ou liste | OK (manuel) |
| user-service         | POST /users/patients/assign (praticien) | 200, patient assigné | OK (manuel) |
| health-data-service  | POST /vitals (valeur hors plage)   | 400                  | OK (manuel) |
| health-data-service  | POST /vitals (valeur valide)       | 201, enregistrement  | OK (manuel) |
| ai-inference-service | POST /predict (SpO2 < 92)         | risk_level high + facteurs | OK (manuel) |
| ai-inference-service | POST /predict (valeurs normales)  | risk_level low       | OK (manuel) |
| api-gateway          | GET /dashboard sans token          | 401                  | OK (manuel) |

## 4. Tests d'intégration

| Flux                                      | Étapes                                                                 | Statut |
|-------------------------------------------|------------------------------------------------------------------------|--------|
| Inscription → Connexion → Tableau de bord | Register → Login → GET /users/me, GET /dashboard                     | OK (manuel) |
| Saisie mesure → Prédiction                | POST /vitals → POST /predict → vérification niveau de risque          | OK (manuel) |
| RBAC praticien                             | Login praticien → GET /users/me/patients → GET /dashboard?patient_ids=... | OK (manuel) |
| Alertes                                   | Création alerte (côté backend) → GET /dashboard contient les alertes   | OK (manuel) |

## 5. Tests de charge (optionnel)

- Nombre de requêtes simultanées : 50
- Endpoints ciblés : /auth/login, /vitals, /predict
- Critères : temps de réponse p95 < 500 ms, taux d'erreur < 1 %

## 6. Sécurité

- [x] Authentification JWT obligatoire sur les routes protégées (api-gateway authMiddleware)
- [x] Validation des plages de valeurs pour les vitaux (health-data-service VITAL_RANGES)
- [x] Pas de fuite de données entre patients (isolation par patient_id / user_id, RBAC /users/me/patients)
- [ ] HTTPS et secrets non exposés en production (à configurer en déploiement)

## 7. Conclusion

Les scénarios ci-dessus ont été validés manuellement en local. Les services répondent conformément aux spécifications (auth, validation, RBAC, inférence IA). Pour une validation automatisée, ajouter des tests pytest (backend) et Jest/React Testing Library (frontend) et les exécuter dans le pipeline CI.
