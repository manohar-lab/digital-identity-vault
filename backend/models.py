"""
ORM Models — Users, Credentials, Consents, Audit Logs, Revocations
"""

import uuid
import datetime
from sqlalchemy import (
    Column, String, Boolean, DateTime, Text,
    JSON, Integer, ForeignKey, Float
)
from sqlalchemy.orm import relationship
from database import Base


def gen_id():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_id)
    did = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    dob = Column(String, nullable=True)
    address = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    credentials = relationship("Credential", back_populates="user")
    consent_requests = relationship("ConsentRequest", back_populates="user")


class Credential(Base):
    __tablename__ = "credentials"

    id = Column(String, primary_key=True, default=gen_id)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    vc_json = Column(JSON, nullable=False)
    vc_type = Column(String, default="IdentityCredential")
    status = Column(String, default="pending")  # pending | active | revoked
    issuer_did = Column(String, nullable=True)
    issued_at = Column(DateTime, nullable=True)
    revoked_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="credentials")


class ConsentRequest(Base):
    __tablename__ = "consent_requests"

    id = Column(String, primary_key=True, default=gen_id)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    bank = Column(String, nullable=False)
    attribute = Column(String, nullable=False)
    approval_code = Column(String, nullable=False)
    status = Column(String, default="pending")  # pending | approved | denied | expired | revoked
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    approved_at = Column(DateTime, nullable=True)
    used = Column(Boolean, default=False)
    nonce = Column(String, nullable=True)
    request_token = Column(String, nullable=True)

    user = relationship("User", back_populates="consent_requests")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    event_type = Column(String, nullable=False)
    actor = Column(String, nullable=False)
    target = Column(String, nullable=True)
    detail = Column(Text, nullable=True)
    metadata_json = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)


class RevocationEntry(Base):
    __tablename__ = "revocation_registry"

    id = Column(Integer, primary_key=True, autoincrement=True)
    credential_id = Column(String, ForeignKey("credentials.id"), nullable=False)
    reason = Column(String, nullable=False)  # COMPROMISED | EXPIRED | USER_REQUEST
    revoked_by = Column(String, nullable=False)
    revoked_at = Column(DateTime, default=datetime.datetime.utcnow)
