"""
Notification Service - Alerts delivery (push, email, SMS).
Stubs for actual providers (FCM, SendGrid, Twilio); stores notifications in memory/DB.
"""
from fastapi import FastAPI, HTTPException, Header, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum

app = FastAPI(title="Notification Service")

class Channel(str, Enum):
    push = "push"
    email = "email"
    sms = "sms"

class SendNotificationRequest(BaseModel):
    user_id: str
    channel: Channel
    title: str
    body: str
    data: Optional[dict] = None

# In-memory store; in production use Redis/DB
notifications: List[dict] = []

def get_user_id(x_user_id: Optional[str] = Header(None)):
    if not x_user_id:
        raise HTTPException(401, "Missing X-User-Id")
    return x_user_id

@app.post("/notifications/send")
async def send_notification(req: SendNotificationRequest, x_user_id: str = Depends(get_user_id)):
    # Stub: log and store; in production call FCM/SendGrid/Twilio
    record = {
        "id": str(len(notifications) + 1),
        "user_id": req.user_id,
        "channel": req.channel.value,
        "title": req.title,
        "body": req.body,
        "data": req.data,
        "sent_at": datetime.utcnow().isoformat(),
        "status": "sent",
    }
    notifications.append(record)
    return record

@app.get("/notifications", response_model=List[dict])
async def list_notifications(x_user_id: str = Depends(get_user_id)):
    user_notifications = [n for n in notifications if n["user_id"] == x_user_id]
    return user_notifications[-50:]

@app.get("/health")
async def health():
    return {"status": "ok", "service": "notification-service"}
