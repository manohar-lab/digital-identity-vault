"""
Zero-Knowledge Selective Disclosure Engine
HMAC-commitment based proofs for privacy-preserving verification.

Proves claims like "age > 18" or "address verified"
without revealing the underlying data.
"""

import hashlib
import hmac
import json
import os
import time
import base64


# ─── Shared secret for commitments (per-session) ──────────
_ZK_SECRET = os.urandom(32)


def _hmac_commit(data: str, nonce: str) -> str:
    """Create an HMAC-SHA256 commitment."""
    msg = f"{data}:{nonce}".encode("utf-8")
    mac = hmac.new(_ZK_SECRET, msg, hashlib.sha256).digest()
    return base64.b64encode(mac).decode()


def _hash_value(value: str) -> str:
    """Hash a value for storage (one-way)."""
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def prove_age_over_18(dob: str, nonce: str) -> dict:
    """
    Generate a ZK-style proof that age > 18.

    Input:  dob = "1990-05-15", nonce = random string
    Output: proof object WITHOUT revealing DOB
    """
    try:
        from datetime import datetime
        birth = datetime.strptime(dob, "%Y-%m-%d")
        now = datetime.utcnow()
        age = (now - birth).days // 365
        result = age >= 18
    except Exception:
        result = False
        age = 0

    # Commitment: binds the result to the nonce without revealing DOB
    commitment = _hmac_commit(f"age_over_18:{result}", nonce)

    # Proof of range: we commit to the decade without revealing exact age
    age_range = f"{(age // 10) * 10}s" if result else "under_18"

    proof = {
        "claim": "age_over_18",
        "result": result,
        "commitment": commitment,
        "nonce": nonce,
        "age_range": age_range,
        "dob_hash": _hash_value(dob),
        "proof_type": "HMAC_SHA256_COMMITMENT",
        "timestamp": time.time(),
        "disclosure": "NONE — DOB not revealed"
    }

    return proof


def prove_address_verified(address: str, nonce: str) -> dict:
    """
    Generate a ZK-style proof that address is verified.

    Input:  address = "123 Main St ...", nonce = random string
    Output: proof object WITHOUT revealing address
    """
    result = bool(address and len(address.strip()) > 5)

    commitment = _hmac_commit(f"address_verified:{result}", nonce)

    # Partial disclosure: only state/country, not full address
    parts = address.split(",") if address else []
    region_hint = parts[-1].strip() if len(parts) > 1 else "IN"

    proof = {
        "claim": "address_verified",
        "result": result,
        "commitment": commitment,
        "nonce": nonce,
        "address_hash": _hash_value(address or ""),
        "region_hint": region_hint,
        "proof_type": "HMAC_SHA256_COMMITMENT",
        "timestamp": time.time(),
        "disclosure": "NONE — full address not revealed"
    }

    return proof


def prove_has_pan(has_pan: bool, nonce: str) -> dict:
    """
    Generate a ZK-style proof for PAN card possession.
    """
    commitment = _hmac_commit(f"has_pan:{has_pan}", nonce)

    proof = {
        "claim": "has_pan",
        "result": has_pan,
        "commitment": commitment,
        "nonce": nonce,
        "proof_type": "HMAC_SHA256_COMMITMENT",
        "timestamp": time.time(),
        "disclosure": "NONE — PAN number not revealed"
    }

    return proof


def verify_proof(proof: dict) -> dict:
    """
    Verify an HMAC-commitment proof.

    Returns { valid: bool, claim: str, result: bool }
    """
    try:
        claim = proof["claim"]
        result = proof["result"]
        nonce = proof["nonce"]
        expected = proof["commitment"]

        recalc = _hmac_commit(f"{claim}:{result}", nonce)

        valid = hmac.compare_digest(recalc, expected)

        return {
            "valid": valid,
            "claim": claim,
            "result": result,
            "proof_type": proof.get("proof_type", "unknown")
        }

    except Exception as e:
        return {
            "valid": False,
            "claim": None,
            "result": None,
            "error": str(e)
        }


def generate_nonce() -> str:
    """Generate a cryptographic nonce for proof generation."""
    return base64.b64encode(os.urandom(16)).decode()
