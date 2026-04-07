"""
User Service - Authentication, profiles, RBAC.
PostgreSQL for users, patients, practitioners.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import select
from jose import jwt
import bcrypt
from datetime import datetime, timedelta
import os
import uuid

BCRYPT_MAX_PASSWORD_LENGTH = 72  # limite bcrypt en octets

# --- Config ---
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/health_users",
)
JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60 * 24

# --- DB ---
class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(unique=True, index=True)
    password_hash: Mapped[str] = mapped_column()
    role: Mapped[str] = mapped_column()  # patient | practitioner | admin
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

class Patient(Base):
    __tablename__ = "patients"
    id: Mapped[str] = mapped_column(primary_key=True)
    user_id: Mapped[str] = mapped_column(unique=True)
    date_of_birth: Mapped[str] = mapped_column(nullable=True)
    gender: Mapped[str] = mapped_column(nullable=True)
    assigned_practitioner_id: Mapped[str] = mapped_column(nullable=True)

engine = create_async_engine(DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
security = HTTPBearer(auto_error=False)


def _hash_password(password: str) -> str:
    raw = password.encode("utf-8")[:BCRYPT_MAX_PASSWORD_LENGTH]
    return bcrypt.hashpw(raw, bcrypt.gensalt()).decode("utf-8")


def _verify_password(password: str, password_hash: str) -> bool:
    raw = password.encode("utf-8")[:BCRYPT_MAX_PASSWORD_LENGTH]
    return bcrypt.checkpw(raw, password_hash.encode("utf-8"))

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()

app = FastAPI(title="User Service", lifespan=lifespan)

# --- Schemas ---
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    role: str = "patient"

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    id: str
    email: str
    role: str
    created_at: datetime

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(401, "Missing token")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except Exception:
        raise HTTPException(401, "Invalid token")

# --- Routes ---
@app.post("/auth/register", response_model=UserResponse)
async def register(data: RegisterRequest):
    if data.role not in ("patient", "practitioner", "admin"):
        raise HTTPException(400, "Invalid role")
    async with async_session() as session:
        r = await session.execute(select(User).where(User.email == data.email))
        if r.scalar_one_or_none():
            raise HTTPException(400, "Email already registered")
        uid = str(uuid.uuid4())
        user = User(id=uid, email=data.email, password_hash=_hash_password(data.password), role=data.role)
        session.add(user)
        if data.role == "patient":
            session.add(Patient(id=str(uuid.uuid4()), user_id=uid))
        await session.commit()
    return UserResponse(id=user.id, email=user.email, role=user.role, created_at=user.created_at)

@app.post("/auth/login", response_model=TokenResponse)
async def login(data: LoginRequest):
    async with async_session() as session:
        r = await session.execute(select(User).where(User.email == data.email))
        user = r.scalar_one_or_none()
    if not user or not _verify_password(data.password, user.password_hash):
        raise HTTPException(401, "Invalid credentials")
    payload = {"sub": user.id, "role": user.role, "exp": datetime.utcnow() + timedelta(minutes=JWT_EXPIRE_MINUTES)}
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return TokenResponse(access_token=token)

@app.get("/users/me", response_model=UserResponse)
async def me(payload: dict = Depends(verify_token)):
    uid = payload.get("sub")
    async with async_session() as session:
        r = await session.execute(select(User).where(User.id == uid))
        user = r.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    return UserResponse(id=user.id, email=user.email, role=user.role, created_at=user.created_at)


@app.get("/users/me/patients")
async def my_patients(payload: dict = Depends(verify_token)):
    """RBAC: pour un patient retourne [user_id]; pour un praticien retourne les user_id des patients qui lui sont assignés."""
    uid = payload.get("sub")
    role = payload.get("role", "patient")
    async with async_session() as session:
        if role == "patient":
            return {"patient_ids": [uid]}
        if role in ("practitioner", "admin"):
            r = await session.execute(
                select(Patient.user_id).where(Patient.assigned_practitioner_id == uid)
            )
            ids = [row[0] for row in r.fetchall()]
            return {"patient_ids": ids}
    return {"patient_ids": []}


class AssignPatientRequest(BaseModel):
    patient_user_id: str


@app.post("/users/patients/assign")
async def assign_patient(data: AssignPatientRequest, payload: dict = Depends(verify_token)):
    """RBAC: un praticien peut s'assigner un patient (assigned_practitioner_id = me)."""
    if payload.get("role") not in ("practitioner", "admin"):
        raise HTTPException(403, "Only practitioners and admins can assign patients")
    practitioner_id = payload.get("sub")
    async with async_session() as session:
        r = await session.execute(select(Patient).where(Patient.user_id == data.patient_user_id))
        patient = r.scalar_one_or_none()
        if not patient:
            raise HTTPException(404, "Patient not found")
        patient.assigned_practitioner_id = practitioner_id
        await session.commit()
    return {"ok": True, "patient_user_id": data.patient_user_id, "assigned_to": practitioner_id}


@app.get("/health")
async def health():
    return {"status": "ok", "service": "user-service"}
