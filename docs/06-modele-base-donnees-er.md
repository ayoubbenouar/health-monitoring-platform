# Modélisation de la base de données – Diagramme ER

## PostgreSQL (données structurées – utilisateurs, métadonnées)

```mermaid
erDiagram
    users {
        uuid id PK
        string email UK
        string password_hash
        string role
        timestamp created_at
        timestamp updated_at
    }

    patients {
        uuid id PK
        uuid user_id FK
        date date_of_birth
        string gender
        uuid assigned_practitioner_id FK
        jsonb preferences
    }

    practitioners {
        uuid id PK
        uuid user_id FK
        string license_number
        string specialty
    }

    user_sessions {
        uuid id PK
        uuid user_id FK
        string token_hash
        timestamp expires_at
    }

    users ||--o| patients : "1:1"
    users ||--o| practitioners : "1:1"
    practitioners ||--o{ patients : "1:N"
    users ||--o{ user_sessions : "1:N"
```

## MongoDB (données de santé – collections principales)

- **vital_records**  
  `{ patientId, type, value, unit, timestamp, source, deviceId?, qualityScore?, validated }`

- **risk_assessments**  
  `{ patientId, riskLevel, confidence, factors[], recommendations[], modelVersion, createdAt }`

- **alerts**  
  `{ patientId, type, severity, message, acknowledged, acknowledgedBy?, createdAt }`

- **audit_logs**  
  `{ userId, action, resource, resourceId, timestamp, ip?, metadata }`

## Schéma relationnel résumé (PostgreSQL)

| Table       | Clé primaire | Clés étrangères              |
|------------|---------------|------------------------------|
| users      | id            | -                            |
| patients   | id            | user_id → users, assigned_practitioner_id → practitioners |
| practitioners | id          | user_id → users              |
| user_sessions | id         | user_id → users              |

Les données temps réel (vitals, assessments, alerts) sont stockées dans MongoDB pour flexibilité et volume ; les relations avec les utilisateurs restent via `patientId` / `userId` cohérents avec PostgreSQL.
