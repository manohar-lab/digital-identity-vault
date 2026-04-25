"""
Consent Lifecycle Manager
Handles: creation, approval, denial, expiration, revocation
Real Twilio SMS delivery with console fallback.
"""

import os
import random
import datetime
from sqlalchemy.orm import Session

from models import ConsentRequest, AuditLog

# ─── Consent TTL ──────────────────────────
CONSENT_TTL_SECONDS = 300  # 5 minutes


# ─── Twilio Config (from env vars) ──────────
TWILIO_SID = os.environ.get("TWILIO_SID", "")
TWILIO_AUTH = os.environ.get("TWILIO_AUTH", "")
TWILIO_FROM = os.environ.get("TWILIO_FROM", "")
TWILIO_WHATSAPP_FROM = os.environ.get("TWILIO_WHATSAPP_FROM", "")


def send_consent_sms(phone: str, code: str, bank: str, attribute: str) -> dict:
    """
    Send consent OTP via real Twilio SMS.
    Falls back to console logging if Twilio is unavailable.
    """
    message = (
        f"🔐 Digital Identity Vault\n"
        f"{bank} requests proof of '{attribute}'.\n"
        f"Approval code: {code}\n"
        f"Valid for 5 minutes. Reply DENY to reject."
    )

    if TWILIO_SID and TWILIO_AUTH and TWILIO_FROM:
        try:
            from twilio.rest import Client
            client = Client(TWILIO_SID, TWILIO_AUTH)

            # Try SMS
            sms = client.messages.create(
                body=message,
                from_=TWILIO_FROM,
                to=phone
            )

            return {
                "delivered": True,
                "channel": "sms",
                "sid": sms.sid
            }

        except Exception as e:
            print(f"[SMS ERROR] {e}")

    # Console fallback
    print(f"\n{'='*50}")
    print(f"📱 CONSENT SMS (console fallback)")
    print(f"   To: {phone}")
    print(f"   Code: {code}")
    print(f"   Bank: {bank}")
    print(f"   Attribute: {attribute}")
    print(f"{'='*50}\n")

    return {
        "delivered": True,
        "channel": "console_fallback",
        "sid": None
    }


def send_consent_whatsapp(phone: str, code: str, bank: str, attribute: str) -> dict:
    """Send consent OTP via Twilio WhatsApp."""
    message = (
        f"🔐 *Digital Identity Vault*\n\n"
        f"*{bank}* requests proof of _{attribute}_.\n"
        f"Approval code: `{code}`\n\n"
        f"Valid for 5 minutes."
    )

    if TWILIO_SID and TWILIO_AUTH and TWILIO_WHATSAPP_FROM:
        try:
            from twilio.rest import Client
            client = Client(TWILIO_SID, TWILIO_AUTH)

            wa = client.messages.create(
                body=message,
                from_=f"whatsapp:{TWILIO_WHATSAPP_FROM}",
                to=f"whatsapp:{phone}"
            )

            return {"delivered": True, "channel": "whatsapp", "sid": wa.sid}

        except Exception as e:
            print(f"[WhatsApp ERROR] {e}")

    return {"delivered": False, "channel": "whatsapp", "sid": None}


def create_consent_request(
    db: Session,
    user_id: str,
    bank: str,
    attribute: str,
    phone: str,
    nonce: str
) -> dict:
    """Create a new consent request with OTP delivery."""

    code = str(random.randint(100000, 999999))
    now = datetime.datetime.utcnow()
    expires = now + datetime.timedelta(seconds=CONSENT_TTL_SECONDS)

    consent = ConsentRequest(
        user_id=user_id,
        bank=bank,
        attribute=attribute,
        approval_code=code,
        status="pending",
        created_at=now,
        expires_at=expires,
        nonce=nonce
    )

    db.add(consent)
    db.commit()
    db.refresh(consent)

    # Deliver OTP
    sms_result = send_consent_sms(phone, code, bank, attribute)

    # Also try WhatsApp
    wa_result = send_consent_whatsapp(phone, code, bank, attribute)

    # Log to push notifications (in-app)
    _create_push_notification(db, user_id, bank, attribute, consent.id)

    # Audit log
    db.add(AuditLog(
        event_type="CONSENT_REQUEST_CREATED",
        actor=bank,
        target=user_id,
        detail=f"Attribute: {attribute}, Consent ID: {consent.id}"
    ))
    db.commit()

    return {
        "consent_id": consent.id,
        "approval_code": code,
        "expires_at": expires.isoformat(),
        "sms": sms_result,
        "whatsapp": wa_result
    }


def approve_consent(db: Session, consent_id: str, code: str) -> dict:
    """Approve a consent request with OTP verification."""

    consent = db.query(ConsentRequest).filter(
        ConsentRequest.id == consent_id
    ).first()

    if not consent:
        return {"approved": False, "reason": "INVALID_REQUEST"}

    if consent.used:
        return {"approved": False, "reason": "CODE_ALREADY_USED"}

    now = datetime.datetime.utcnow()
    if now > consent.expires_at:
        consent.status = "expired"
        db.commit()
        return {"approved": False, "reason": "CODE_EXPIRED"}

    if consent.status == "revoked":
        return {"approved": False, "reason": "CONSENT_REVOKED"}

    if consent.status == "denied":
        return {"approved": False, "reason": "CONSENT_DENIED"}

    if code != consent.approval_code:
        return {"approved": False, "reason": "INVALID_CODE"}

    consent.status = "approved"
    consent.approved_at = now
    db.commit()

    db.add(AuditLog(
        event_type="CONSENT_APPROVED",
        actor=consent.user_id,
        target=consent.bank,
        detail=f"Consent {consent_id} approved for {consent.attribute}"
    ))
    db.commit()

    return {"approved": True, "consent_id": consent_id}


def deny_consent(db: Session, consent_id: str) -> dict:
    """User explicitly denies a consent request."""

    consent = db.query(ConsentRequest).filter(
        ConsentRequest.id == consent_id
    ).first()

    if not consent:
        return {"denied": False, "reason": "INVALID_REQUEST"}

    consent.status = "denied"
    db.commit()

    db.add(AuditLog(
        event_type="CONSENT_DENIED",
        actor=consent.user_id,
        target=consent.bank,
        detail=f"Consent {consent_id} denied"
    ))
    db.commit()

    return {"denied": True, "consent_id": consent_id}


def revoke_consent(db: Session, consent_id: str) -> dict:
    """User revokes a previously approved consent."""

    consent = db.query(ConsentRequest).filter(
        ConsentRequest.id == consent_id
    ).first()

    if not consent:
        return {"revoked": False, "reason": "INVALID_REQUEST"}

    consent.status = "revoked"
    db.commit()

    db.add(AuditLog(
        event_type="CONSENT_REVOKED",
        actor=consent.user_id,
        target=consent.bank,
        detail=f"Consent {consent_id} revoked"
    ))
    db.commit()

    return {"revoked": True, "consent_id": consent_id}


def get_consent_history(db: Session, user_id: str) -> list:
    """Get full consent history for a user."""

    consents = db.query(ConsentRequest).filter(
        ConsentRequest.user_id == user_id
    ).order_by(ConsentRequest.created_at.desc()).all()

    result = []
    now = datetime.datetime.utcnow()

    for c in consents:
        # Auto-expire
        if c.status == "pending" and now > c.expires_at:
            c.status = "expired"
            db.commit()

        result.append({
            "id": c.id,
            "bank": c.bank,
            "attribute": c.attribute,
            "status": c.status,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "expires_at": c.expires_at.isoformat() if c.expires_at else None,
            "approved_at": c.approved_at.isoformat() if c.approved_at else None,
            "used": c.used
        })

    return result


def _create_push_notification(
    db: Session,
    user_id: str,
    bank: str,
    attribute: str,
    consent_id: str
):
    """Store in-app push notification (polled by wallet frontend)."""
    db.add(AuditLog(
        event_type="PUSH_NOTIFICATION",
        actor="system",
        target=user_id,
        detail=f"{bank} requests proof of {attribute}",
        metadata_json={
            "consent_id": consent_id,
            "bank": bank,
            "attribute": attribute,
            "type": "consent_request"
        }
    ))
    db.commit()
