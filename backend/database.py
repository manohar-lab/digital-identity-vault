"""
Database layer — SQLAlchemy + SQLite
Zero-config persistent storage for the Digital Identity Vault.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = "sqlite:///./vault.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def get_db():
    """FastAPI dependency — yields a DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables from ORM models."""
    from models import (
        User, Credential, ConsentRequest,
        AuditLog, RevocationEntry
    )
    Base.metadata.create_all(bind=engine)
