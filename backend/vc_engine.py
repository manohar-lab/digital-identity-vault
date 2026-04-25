"""
W3C Verifiable Credentials Engine
- DID generation (did:div:<uuid>)
- Ed25519 key pair management
- VC issuance with real signatures
- VC verification
"""

import json
import uuid
import datetime
import base64
import hashlib

from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey
)
from cryptography.hazmat.primitives import serialization


# ─── Government Issuer Key Pair ──────────────────────────────
_ISSUER_PRIVATE_KEY = Ed25519PrivateKey.generate()
_ISSUER_PUBLIC_KEY = _ISSUER_PRIVATE_KEY.public_key()

ISSUER_DID = "did:div:government-of-india"


def get_issuer_public_key_b64() -> str:
    """Return the issuer's public key as base64 (for verification)."""
    raw = _ISSUER_PUBLIC_KEY.public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw
    )
    return base64.b64encode(raw).decode()


def generate_user_did() -> str:
    """Generate a decentralized identifier for a user."""
    return f"did:div:{uuid.uuid4()}"


def _sign(payload_bytes: bytes) -> str:
    """Sign bytes with the issuer's Ed25519 private key."""
    sig = _ISSUER_PRIVATE_KEY.sign(payload_bytes)
    return base64.b64encode(sig).decode()


def issue_verifiable_credential(
    user_did: str,
    credential_subject: dict,
    credential_id: str | None = None
) -> dict:
    """
    Issue a W3C-compliant Verifiable Credential.

    Returns a full VC JSON object with a real Ed25519 proof.
    """
    cred_id = credential_id or f"urn:uuid:{uuid.uuid4()}"
    now = datetime.datetime.utcnow().isoformat() + "Z"

    vc = {
        "@context": [
            "https://www.w3.org/2018/credentials/v1",
            "https://w3id.org/security/suites/ed25519-2020/v1"
        ],
        "id": cred_id,
        "type": ["VerifiableCredential", "IdentityCredential"],
        "issuer": {
            "id": ISSUER_DID,
            "name": "Government of India — Digital Identity Authority"
        },
        "issuanceDate": now,
        "credentialSubject": {
            "id": user_did,
            **credential_subject
        }
    }

    # Sign the canonical JSON payload
    payload = json.dumps(vc, sort_keys=True, separators=(",", ":"))
    signature = _sign(payload.encode("utf-8"))

    vc["proof"] = {
        "type": "Ed25519Signature2020",
        "created": now,
        "verificationMethod": f"{ISSUER_DID}#key-1",
        "proofPurpose": "assertionMethod",
        "proofValue": signature
    }

    return vc


def verify_credential(vc: dict) -> dict:
    """
    Verify a VC's Ed25519 signature.

    Returns { valid: bool, issuer: str, reason: str }
    """
    try:
        proof = vc.get("proof")
        if not proof:
            return {"valid": False, "issuer": None, "reason": "NO_PROOF"}

        signature_b64 = proof["proofValue"]
        signature = base64.b64decode(signature_b64)

        # Reconstruct the payload (VC without proof)
        vc_copy = {k: v for k, v in vc.items() if k != "proof"}
        payload = json.dumps(vc_copy, sort_keys=True, separators=(",", ":"))

        # Verify with issuer public key
        _ISSUER_PUBLIC_KEY.verify(signature, payload.encode("utf-8"))

        return {
            "valid": True,
            "issuer": vc.get("issuer", {}).get("id", "unknown"),
            "reason": "SIGNATURE_VALID"
        }

    except Exception as e:
        return {
            "valid": False,
            "issuer": None,
            "reason": f"VERIFICATION_FAILED: {str(e)}"
        }
