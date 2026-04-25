"""
Credential Revocation Registry
CRL-style revocation list backed by SQLite.
Government can revoke; banks check before accepting proofs.
"""

import datetime
from sqlalchemy.orm import Session

from models import RevocationEntry, Credential, AuditLog


def revoke_credential(
    db: Session,
    credential_id: str,
    reason: str,
    revoked_by: str
) -> dict:
    """
    Revoke a credential.

    reason: COMPROMISED | EXPIRED | USER_REQUEST
    revoked_by: officer_id or user_id
    """
    cred = db.query(Credential).filter(
        Credential.id == credential_id
    ).first()

    if not cred:
        return {"revoked": False, "reason": "CREDENTIAL_NOT_FOUND"}

    if cred.status == "revoked":
        return {"revoked": False, "reason": "ALREADY_REVOKED"}

    # Update credential status
    cred.status = "revoked"
    cred.revoked_at = datetime.datetime.utcnow()
    db.commit()

    # Add to revocation registry
    entry = RevocationEntry(
        credential_id=credential_id,
        reason=reason,
        revoked_by=revoked_by
    )
    db.add(entry)

    # Audit log
    db.add(AuditLog(
        event_type="CREDENTIAL_REVOKED",
        actor=revoked_by,
        target=credential_id,
        detail=f"Reason: {reason}"
    ))
    db.commit()

    return {
        "revoked": True,
        "credential_id": credential_id,
        "reason": reason,
        "revoked_at": cred.revoked_at.isoformat()
    }


def check_revocation_status(db: Session, credential_id: str) -> dict:
    """
    Check whether a credential is revoked.

    Banks call this before accepting any proof.
    """
    entry = db.query(RevocationEntry).filter(
        RevocationEntry.credential_id == credential_id
    ).first()

    if entry:
        return {
            "revoked": True,
            "credential_id": credential_id,
            "reason": entry.reason,
            "revoked_by": entry.revoked_by,
            "revoked_at": entry.revoked_at.isoformat() if entry.revoked_at else None
        }

    # Also check credential status directly
    cred = db.query(Credential).filter(
        Credential.id == credential_id
    ).first()

    if cred and cred.status == "revoked":
        return {
            "revoked": True,
            "credential_id": credential_id,
            "reason": "STATUS_REVOKED",
            "revoked_by": "unknown",
            "revoked_at": cred.revoked_at.isoformat() if cred.revoked_at else None
        }

    return {
        "revoked": False,
        "credential_id": credential_id
    }


def get_revocation_list(db: Session) -> list:
    """Return the full revocation registry."""
    entries = db.query(RevocationEntry).order_by(
        RevocationEntry.revoked_at.desc()
    ).all()

    return [
        {
            "credential_id": e.credential_id,
            "reason": e.reason,
            "revoked_by": e.revoked_by,
            "revoked_at": e.revoked_at.isoformat() if e.revoked_at else None
        }
        for e in entries
    ]
