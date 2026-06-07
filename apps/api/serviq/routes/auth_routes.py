"""Auth routes for Email 2FA (OTP)."""
from __future__ import annotations

import os
import random
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db.session import get_session
from ..models import ServiqVerificationToken
from ..schemas import SendOtpRequest, VerifyOtpRequest, VerifyOtpResponse

router = APIRouter(prefix="/auth", tags=["auth"])

def db_session():
    db = get_session()
    try:
        yield db
    finally:
        db.close()

def generate_otp() -> str:
    return str(random.randint(100000, 999999))

@router.post("/send-otp")
def send_otp(body: SendOtpRequest, db: Session = Depends(db_session)) -> dict:
    email = body.email.strip().lower()
    if not email:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Email is required.")

    # Delete existing tokens for this email
    stmt = select(ServiqVerificationToken).where(ServiqVerificationToken.email == email)
    for existing in db.scalars(stmt).all():
        db.delete(existing)

    token = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=15)

    verification_token = ServiqVerificationToken(
        email=email,
        token=token,
        expires_at=expires_at
    )
    db.add(verification_token)
    db.commit()

    # Simulate email sending for now (or integrate with resend in future)
    # In a real scenario, call EmailProviderStub().send(...)
    print(f"--- OTP EMAIL SIMULATION ---")
    print(f"To: {email}")
    print(f"Code: {token}")
    print(f"----------------------------")

    return {"success": True, "message": "OTP sent to email."}

@router.post("/verify-otp", response_model=VerifyOtpResponse)
def verify_otp(body: VerifyOtpRequest, db: Session = Depends(db_session)) -> dict:
    email = body.email.strip().lower()
    code = body.code.strip()

    stmt = select(ServiqVerificationToken).where(
        ServiqVerificationToken.email == email,
        ServiqVerificationToken.token == code
    )
    existing_token = db.scalars(stmt).first()

    if not existing_token:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid code.")

    # Check expiration (aware vs naive datetime handling if timezone=True is used)
    # Both are naive UTC here since we use datetime.utcnow()
    # But just in case postgres returns timezone-aware:
    now = datetime.utcnow()
    expires_at = existing_token.expires_at
    if expires_at.tzinfo:
        from datetime import timezone
        now = now.replace(tzinfo=timezone.utc)

    if expires_at < now:
        db.delete(existing_token)
        db.commit()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Code has expired.")

    # Validation successful, delete the token
    db.delete(existing_token)
    db.commit()

    # Return the mock API Key for the user to login
    # In production, this would return a signed JWT.
    api_key = os.environ.get("OPENOPS_API_KEY", "test")

    return {
        "success": True,
        "api_key": api_key,
        "message": "Login successful!"
    }
