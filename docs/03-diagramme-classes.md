# Diagramme de classes

## Représentation Mermaid

```mermaid
classDiagram
    class User {
        +id: UUID
        +email: string
        +passwordHash: string
        +role: Role
        +createdAt: datetime
        +authenticate()
        +hasRole(role)
    }

    class Patient {
        +userId: UUID
        +dateOfBirth: date
        +gender: string
        +assignedPractitionerId: UUID
        +getVitals()
        +getAlerts()
    }

    class Practitioner {
        +userId: UUID
        +licenseNumber: string
        +specialty: string
        +getPatients()
        +getPatientVitals(patientId)
    }

    class VitalRecord {
        +id: UUID
        +patientId: UUID
        +type: VitalType
        +value: float
        +unit: string
        +timestamp: datetime
        +source: string
        +isValidated: bool
    }

    class VitalType {
        <<enumeration>>
        HEART_RATE
        BLOOD_PRESSURE_SYSTOLIC
        BLOOD_PRESSURE_DIASTOLIC
        SPO2
        TEMPERATURE
    }

    class RiskAssessment {
        +id: UUID
        +patientId: UUID
        +riskLevel: RiskLevel
        +confidence: float
        +factors: string[]
        +recommendations: string[]
        +modelVersion: string
        +createdAt: datetime
    }

    class RiskLevel {
        <<enumeration>>
        LOW
        MODERATE
        HIGH
        CRITICAL
    }

    class Alert {
        +id: UUID
        +patientId: UUID
        +type: AlertType
        +message: string
        +severity: Severity
        +acknowledged: bool
        +createdAt: datetime
    }

    class Notification {
        +id: UUID
        +userId: UUID
        +channel: Channel
        +payload: json
        +sentAt: datetime
        +status: DeliveryStatus
    }

    User <|-- Patient
    User <|-- Practitioner
    User "1" --> "*" Notification : receives
    Patient "1" --> "*" VitalRecord : has
    Patient "1" --> "*" RiskAssessment : has
    Patient "1" --> "*" Alert : has
    Practitioner "1" --> "*" Patient : follows
    VitalRecord --> VitalType : type
    RiskAssessment --> RiskLevel : level
```

## Packages / modules

- **User management** : User, Patient, Practitioner (profil, auth, rôles).
- **Health data** : VitalRecord, VitalType (stockage et validation).
- **AI / Analytics** : RiskAssessment, RiskLevel (résultats des modèles).
- **Notifications** : Alert, Notification (alertes métier et envoi).
