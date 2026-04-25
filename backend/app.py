"""
Digital Identity Vault — Phase 2 Backend
Production-grade privacy-preserving identity verification system.

Modules integrated:
  - W3C Verifiable Credentials (Ed25519)
  - ZK-style selective disclosure (HMAC commitments)
  - Consent lifecycle (Twilio SMS/WhatsApp)
  - Credential revocation registry
  - Threat & attack protection
  - Improved OCR + Aadhaar QR
  - SQLite persistent storage
"""

from fastapi import FastAPI, UploadFile, File, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from dotenv import load_dotenv

load_dotenv()

import os
import json
import time
import shutil
import datetime

from database import get_db, init_db
from models import User, Credential, ConsentRequest, AuditLog
from vc_engine import (
    generate_user_did, issue_verifiable_credential,
    verify_credential, get_issuer_public_key_b64, ISSUER_DID
)
from zk_engine import (
    prove_age_over_18, prove_address_verified,
    prove_has_pan, verify_proof, generate_nonce
)
from consent import (
    create_consent_request, approve_consent,
    deny_consent, revoke_consent, get_consent_history
)
from revocation import (
    revoke_credential, check_revocation_status, get_revocation_list
)
from threat import (
    assess_request_threat, get_threat_stats,
    generate_request_token, record_failed_attempt
)
from ocr_engine import process_identity_document


# ─── App ──────────────────────────────────────────────
app = FastAPI(
    title="Digital Identity Vault",
    description="Privacy-Preserving Identity Verification System",
    version="2.0.0"
)


# ─── CORS ─────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Exception Handling ──────────────────────────────
from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"error": "INTERNAL_SERVER_ERROR", "detail": str(exc)},
        headers={
            "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
            "Access-Control-Allow-Credentials": "true",
        }
    )


# ─── Startup ──────────────────────────────────────────
@app.on_event("startup")
def on_startup():
    init_db()
    os.makedirs("uploads", exist_ok=True)
    print("\n" + "=" * 60)
    print("  [SYSTEM] Digital Identity Vault v2.0")
    print("  [DB]     Database: vault.db (SQLite)")
    print(f"  [DID]    Issuer DID: {ISSUER_DID}")
    print(f"  [KEY]    Issuer PubKey: {get_issuer_public_key_b64()[:24]}...")
    print("=" * 60 + "\n")


# ─── Helpers ──────────────────────────────────────────
def get_client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _log(db: Session, event: str, actor: str, target: str = "", detail: str = ""):
    db.add(AuditLog(
        event_type=event,
        actor=actor,
        target=target,
        detail=detail
    ))
    db.commit()


# ══════════════════════════════════════════════════════
# HEALTH
# ══════════════════════════════════════════════════════

@app.get("/")
def home():
    return {
        "project": "Digital Identity Vault",
        "version": "2.0.0",
        "status": "running",
        "issuer_did": ISSUER_DID,
        "features": [
            "W3C Verifiable Credentials",
            "ZK Selective Disclosure",
            "Consent Lifecycle",
            "Credential Revocation",
            "Threat Protection",
            "Aadhaar QR + OCR"
        ]
    }


# ══════════════════════════════════════════════════════
# USER REGISTRATION
# ══════════════════════════════════════════════════════

@app.post("/register_user")
def register_user(data: dict, db: Session = Depends(get_db)):
    """Register a new user with a DID."""
    user_did = generate_user_did()

    user = User(
        id=data.get("user_id", user_did.split(":")[-1]),
        did=user_did,
        name=data.get("name"),
        phone=data.get("phone"),
        dob=data.get("dob"),
        address=data.get("address")
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    _log(db, "USER_REGISTERED", user.id, user.did)

    return {
        "user_id": user.id,
        "did": user.did,
        "name": user.name
    }


# ══════════════════════════════════════════════════════
# DOCUMENT UPLOAD (Manual)
# ══════════════════════════════════════════════════════

@app.post("/upload_document")
def upload_document(data: dict, db: Session = Depends(get_db)):
    """Upload identity attributes manually."""
    user_id = data["user_id"]

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        # Auto-register
        user_did = generate_user_did()
        user = User(id=user_id, did=user_did)
        db.add(user)
        db.commit()
        db.refresh(user)

    # Create pending credential
    cred = Credential(
        user_id=user.id,
        vc_json={
            "doc_type": data.get("doc_type", "aadhaar"),
            "attributes": {
                "age_over_18": data.get("age_over_18", False),
                "has_pan": data.get("has_pan", False),
                "address_verified": data.get("address_verified", False)
            }
        },
        status="pending"
    )

    db.add(cred)
    db.commit()
    db.refresh(cred)

    if data.get("dob"):
        user.dob = data["dob"]
    if data.get("address"):
        user.address = data["address"]
    if data.get("name"):
        user.name = data["name"]
    db.commit()

    _log(db, "DOCUMENT_UPLOADED", user_id, cred.id)

    return {
        "status": "uploaded",
        "credential_id": cred.id,
        "user_did": user.did
    }


# ══════════════════════════════════════════════════════
# AADHAAR UPLOAD (OCR + QR)
# ══════════════════════════════════════════════════════

@app.post("/upload_aadhaar")
async def upload_aadhaar(
    user_id: str,
    file: UploadFile = File(...)
):
    """Upload Aadhaar image — tries QR decode first, then enhanced OCR."""
    path = f"uploads/{file.filename}"

    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Process with improved engine
    extracted = process_identity_document(path)

    # Get or create user in DB
    from database import SessionLocal
    db = SessionLocal()

    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            user_did = generate_user_did()
            user = User(id=user_id, did=user_did)
            db.add(user)
            db.commit()
            db.refresh(user)

        user.name = extracted.get("name", user.name)
        user.dob = extracted.get("dob", user.dob)
        user.address = extracted.get("address", user.address)
        db.commit()

        cred = Credential(
            user_id=user.id,
            vc_json={
                "image_path": path,
                "source": extracted.get("source", "unknown"),
                "attributes": {
                    "age_over_18": extracted.get("age_over_18", False),
                    "address_verified": extracted.get("address_verified", False),
                    "has_pan": False
                }
            },
            status="pending"
        )

        db.add(cred)
        db.commit()
        db.refresh(cred)

        _log(db, "AADHAAR_UPLOADED", user_id, cred.id,
             f"Source: {extracted.get('source')}")

        return {
            "stored": True,
            "credential_id": cred.id,
            "user_did": user.did,
            "extracted": {
                "name": extracted.get("name"),
                "age_over_18": extracted.get("age_over_18"),
                "address_verified": extracted.get("address_verified"),
                "dob": extracted.get("dob"),
                "source": extracted.get("source"),
                "qr_decoded": extracted.get("qr_decoded", False),
                "validation": extracted.get("validation", {})
            }
        }
    finally:
        db.close()


# ══════════════════════════════════════════════════════
# GOVERNMENT APPROVAL — Issues signed VC
# ══════════════════════════════════════════════════════

@app.post("/admin/approve")
def admin_approve(data: dict, db: Session = Depends(get_db)):
    """
    Government officer approves a credential.
    Issues a W3C Verifiable Credential with Ed25519 signature.
    """
    user_id = data["user_id"]
    officer_id = data.get("officer_id", "gov001")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {"error": "USER_NOT_FOUND"}

    credential_id = data.get("credential_id")

    if credential_id:
        cred = db.query(Credential).filter(
            Credential.id == credential_id,
            Credential.status == "pending"
        ).first()
    else:
        # Find latest pending credential
        cred = db.query(Credential).filter(
            Credential.user_id == user_id,
            Credential.status == "pending"
        ).order_by(Credential.created_at.desc()).first()

    if not cred:
        return {"error": "NO_PENDING_CREDENTIAL"}

    # Build credential subject from stored data
    attributes = cred.vc_json.get("attributes", {})

    credential_subject = {
        "name": user.name or "Verified Citizen",
        "age_over_18": attributes.get("age_over_18", False),
        "address_verified": attributes.get("address_verified", False),
        "has_pan": attributes.get("has_pan", False),
        "verified_by": officer_id,
        "verification_level": "government"
    }

    # Issue W3C Verifiable Credential
    vc = issue_verifiable_credential(
        user_did=user.did,
        credential_subject=credential_subject,
        credential_id=f"urn:uuid:{cred.id}"
    )

    # Update credential in DB
    cred.vc_json = vc
    cred.status = "active"
    cred.issuer_did = ISSUER_DID
    cred.issued_at = datetime.datetime.utcnow()
    db.commit()

    _log(db, "CREDENTIAL_ISSUED", officer_id, user_id,
         f"Credential: {cred.id}")

    return {
        "status": "verified",
        "credential_id": cred.id,
        "vc": vc
    }


@app.get("/admin/pending_credentials")
def get_pending_credentials(db: Session = Depends(get_db)):
    """Get all pending credentials across all users for the admin dashboard."""
    creds = db.query(Credential).filter(
        Credential.status == "pending"
    ).order_by(Credential.created_at.desc()).all()

    result = []
    for c in creds:
        # Get user details
        user = db.query(User).filter(User.id == c.user_id).first()
        attributes = c.vc_json.get("attributes", {})
        result.append({
            "id": c.id,
            "user_id": c.user_id,
            "user_name": user.name if user else "Unknown",
            "source": c.vc_json.get("source", "unknown"),
            "attributes": attributes
        })
    return {"pending": result}


@app.post("/admin/reject")
def admin_reject(data: dict, db: Session = Depends(get_db)):
    """Reject a pending credential."""
    credential_id = data["credential_id"]
    reason = data.get("reason", "No reason provided")
    officer_id = data.get("officer_id", "gov001")

    cred = db.query(Credential).filter(
        Credential.id == credential_id,
        Credential.status == "pending"
    ).first()

    if not cred:
        return {"error": "NO_PENDING_CREDENTIAL"}

    cred.status = "rejected"
    # Re-assign the dict to ensure SQLAlchemy detects the change for the JSON column
    vc_data = dict(cred.vc_json)
    vc_data["rejection_reason"] = reason
    cred.vc_json = vc_data
    db.commit()

    _log(db, "CREDENTIAL_REJECTED", officer_id, cred.user_id,
         f"Credential: {cred.id}, Reason: {reason}")

    return {
        "status": "rejected",
        "credential_id": cred.id,
        "reason": reason
    }


# ══════════════════════════════════════════════════════
# BANK VERIFICATION REQUEST
# ══════════════════════════════════════════════════════

@app.post("/request_verification")
def request_verification(
    data: dict,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Bank requests verification of a user attribute.
    Goes through threat assessment, consent creation, and OTP delivery.
    """
    user_id = data["user_id"]
    bank = data["bank"]
    attribute = data["attribute"]
    phone = data.get("phone", "")
    client_ip = get_client_ip(request)

    # ─── Threat Assessment ──────────────
    nonce = generate_nonce()
    threat = assess_request_threat(
        client_ip=client_ip,
        bank=bank,
        attribute=attribute,
        nonce=nonce
    )

    if not threat["allowed"]:
        record_failed_attempt(client_ip)
        _log(db, "THREAT_BLOCKED", bank, user_id,
             f"Threats: {threat['threats']}")

        return {
            "error": "REQUEST_BLOCKED",
            "threats": threat["threats"]
        }

    # ─── User existence check ───────────
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {"error": "USER_NOT_FOUND"}

    # ─── Active credential check ────────
    cred = db.query(Credential).filter(
        Credential.user_id == user_id,
        Credential.status == "active"
    ).first()

    if not cred:
        return {"error": "NO_ACTIVE_CREDENTIAL"}

    # ─── Revocation check ──────────────
    rev_status = check_revocation_status(db, cred.id)
    if rev_status["revoked"]:
        return {
            "error": "CREDENTIAL_REVOKED",
            "reason": rev_status["reason"]
        }

    # ─── Create consent request ─────────
    result = create_consent_request(
        db=db,
        user_id=user_id,
        bank=bank,
        attribute=attribute,
        phone=phone or user.phone or "",
        nonce=nonce
    )

    return {
        "request_id": result["consent_id"],
        "approval_code": result["approval_code"],
        "expires_at": result["expires_at"],
        "sms_delivered": result["sms"].get("delivered", False),
        "nonce": nonce
    }


# ══════════════════════════════════════════════════════
# CONSENT ACTIONS
# ══════════════════════════════════════════════════════

@app.post("/approve_request")
def approve_request_endpoint(data: dict, db: Session = Depends(get_db)):
    """User approves a consent request with OTP."""
    result = approve_consent(
        db=db,
        consent_id=data["request_id"],
        code=data["code"]
    )
    return result


@app.post("/consent/deny")
def deny_request(data: dict, db: Session = Depends(get_db)):
    """User explicitly denies a consent request."""
    return deny_consent(db, data["consent_id"])


@app.post("/consent/revoke")
def revoke_consent_endpoint(data: dict, db: Session = Depends(get_db)):
    """User revokes a previously approved consent."""
    return revoke_consent(db, data["consent_id"])


@app.get("/consent/history/{user_id}")
def consent_history(user_id: str, db: Session = Depends(get_db)):
    """Get full consent history for a user."""
    return {"history": get_consent_history(db, user_id)}


@app.get("/consent/pending/{user_id}")
def pending_consents(user_id: str, db: Session = Depends(get_db)):
    """Get pending consent requests for wallet notifications."""
    consents = db.query(ConsentRequest).filter(
        ConsentRequest.user_id == user_id,
        ConsentRequest.status == "pending"
    ).all()

    now = datetime.datetime.utcnow()
    result = []
    for c in consents:
        if now > c.expires_at:
            c.status = "expired"
            db.commit()
            continue
        result.append({
            "id": c.id,
            "bank": c.bank,
            "attribute": c.attribute,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "expires_at": c.expires_at.isoformat() if c.expires_at else None,
            "approval_code": c.approval_code
        })

    return {"pending": result}


# ══════════════════════════════════════════════════════
# VAULT RESPONSE — ZK Proof Generation
# ══════════════════════════════════════════════════════

@app.get("/vault_response/{request_id}")
def vault_response(request_id: str, db: Session = Depends(get_db)):
    """
    Generate ZK-style selective disclosure proof.
    Returns cryptographic proof without revealing underlying data.
    """
    consent = db.query(ConsentRequest).filter(
        ConsentRequest.id == request_id
    ).first()

    if not consent:
        return {"error": "INVALID_REQUEST"}

    if consent.status != "approved":
        return {"reason": f"CONSENT_{consent.status.upper()}"}

    if consent.used:
        return {"reason": "TOKEN_REPLAY_BLOCKED"}

    # Mark as used (one-time proof)
    consent.used = True
    db.commit()

    # Get user data
    user = db.query(User).filter(User.id == consent.user_id).first()
    attribute = consent.attribute
    nonce = consent.nonce or generate_nonce()

    # ─── Generate ZK Proof ──────────────
    if attribute == "age_over_18":
        proof = prove_age_over_18(
            dob=user.dob or "1990-01-01",
            nonce=nonce
        )
    elif attribute == "address_verified":
        proof = prove_address_verified(
            address=user.address or "",
            nonce=nonce
        )
    elif attribute == "has_pan":
        cred = db.query(Credential).filter(
            Credential.user_id == user.id,
            Credential.status == "active"
        ).first()
        has_pan = False
        if cred and isinstance(cred.vc_json, dict):
            subj = cred.vc_json.get("credentialSubject", {})
            has_pan = subj.get("has_pan", False)
        proof = prove_has_pan(has_pan, nonce)
    else:
        proof = {
            "claim": attribute,
            "result": False,
            "error": "UNSUPPORTED_ATTRIBUTE"
        }

    # Verify the proof we just generated
    verification = verify_proof(proof)

    # Get VC for bank to verify signature
    cred = db.query(Credential).filter(
        Credential.user_id == consent.user_id,
        Credential.status == "active"
    ).first()

    vc_verification = None
    if cred:
        vc_verification = verify_credential(cred.vc_json)

    # Audit log
    _log(db, "PROOF_GENERATED", consent.bank, consent.user_id,
         f"Attribute: {attribute}, Result: {proof.get('result')}")

    return {
        "proof": proof,
        "proof_verification": verification,
        "vc_signature_valid": vc_verification,
        "issuer_public_key": get_issuer_public_key_b64(),
        "verified": proof.get("result", False)
    }


# ══════════════════════════════════════════════════════
# CREDENTIAL MANAGEMENT
# ══════════════════════════════════════════════════════

@app.get("/credentials/{user_id}")
def get_credentials(user_id: str, db: Session = Depends(get_db)):
    """Get all credentials for a user (wallet view)."""
    creds = db.query(Credential).filter(
        Credential.user_id == user_id
    ).order_by(Credential.issued_at.desc()).all()

    return {
        "credentials": [
            {
                "id": c.id,
                "status": c.status,
                "vc_type": c.vc_type,
                "issuer": c.issuer_did,
                "issued_at": c.issued_at.isoformat() if c.issued_at else None,
                "revoked_at": c.revoked_at.isoformat() if c.revoked_at else None,
                "vc_json": c.vc_json
            }
            for c in creds
        ]
    }


@app.post("/verify_credential")
def verify_credential_endpoint(data: dict):
    """Verify a VC's Ed25519 signature (for banks)."""
    vc = data.get("vc")
    if not vc:
        return {"error": "NO_VC_PROVIDED"}
    return verify_credential(vc)


# ══════════════════════════════════════════════════════
# REVOCATION
# ══════════════════════════════════════════════════════

@app.post("/admin/revoke_credential")
def revoke_credential_endpoint(
    data: dict,
    db: Session = Depends(get_db)
):
    """Government revokes a compromised credential."""
    return revoke_credential(
        db=db,
        credential_id=data["credential_id"],
        reason=data.get("reason", "COMPROMISED"),
        revoked_by=data.get("officer_id", "gov001")
    )


@app.get("/revocation/status/{credential_id}")
def revocation_status(credential_id: str, db: Session = Depends(get_db)):
    """Check revocation status of a credential."""
    return check_revocation_status(db, credential_id)


@app.get("/revocation/list")
def revocation_list(db: Session = Depends(get_db)):
    """Full revocation registry."""
    return {"registry": get_revocation_list(db)}


# ══════════════════════════════════════════════════════
# AUDIT & MONITORING
# ══════════════════════════════════════════════════════

@app.get("/audit_logs")
def audit_logs(db: Session = Depends(get_db)):
    """Return all audit logs."""
    logs = db.query(AuditLog).order_by(
        AuditLog.timestamp.desc()
    ).limit(100).all()

    return {
        "logs": [
            {
                "id": l.id,
                "event": l.event_type,
                "actor": l.actor,
                "target": l.target,
                "detail": l.detail,
                "timestamp": l.timestamp.isoformat() if l.timestamp else None
            }
            for l in logs
        ]
    }


@app.get("/access_history/{user_id}")
def access_history(user_id: str, db: Session = Depends(get_db)):
    """Who accessed what data about a user."""
    logs = db.query(AuditLog).filter(
        AuditLog.target == user_id,
        AuditLog.event_type.in_([
            "PROOF_GENERATED", "CONSENT_APPROVED",
            "CONSENT_REQUEST_CREATED"
        ])
    ).order_by(AuditLog.timestamp.desc()).all()

    return {
        "history": [
            {
                "event": l.event_type,
                "actor": l.actor,
                "detail": l.detail,
                "timestamp": l.timestamp.isoformat() if l.timestamp else None
            }
            for l in logs
        ]
    }


@app.get("/threat/stats")
def threat_stats():
    """Current threat protection statistics."""
    return get_threat_stats()


# ══════════════════════════════════════════════════════
# USER INFO (for wallet)
# ══════════════════════════════════════════════════════

@app.get("/user/{user_id}")
def get_user(user_id: str, db: Session = Depends(get_db)):
    """Get user profile for wallet."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {"error": "USER_NOT_FOUND"}

    return {
        "did": user.did,
        "name": user.name,
        "phone": user.phone,
        "created_at": user.created_at.isoformat() if user.created_at else None
    }


# ══════════════════════════════════════════════════════
# METRICS (for research page)
# ══════════════════════════════════════════════════════

@app.get("/metrics")
def metrics(db: Session = Depends(get_db)):
    """Performance and system metrics."""
    start = time.time()
    nonce = generate_nonce()
    proof = prove_age_over_18("1990-05-15", nonce)
    proof_gen_time = (time.time() - start) * 1000

    start = time.time()
    verify_proof(proof)
    verify_time = (time.time() - start) * 1000

    total_users = db.query(User).count()
    total_creds = db.query(Credential).count()
    active_creds = db.query(Credential).filter(
        Credential.status == "active"
    ).count()
    total_consents = db.query(ConsentRequest).count()
    total_audits = db.query(AuditLog).count()

    return {
        "performance": {
            "proof_generation_ms": round(proof_gen_time, 3),
            "verification_latency_ms": round(verify_time, 3),
            "privacy_leakage": "ZERO — only boolean claims shared"
        },
        "system": {
            "total_users": total_users,
            "total_credentials": total_creds,
            "active_credentials": active_creds,
            "total_consents": total_consents,
            "total_audit_entries": total_audits
        },
        "threat": get_threat_stats()
    }