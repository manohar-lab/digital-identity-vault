"""
Improved OCR + Aadhaar QR Parsing Engine
- Primary: Aadhaar Secure QR decode (zlib + base10 → XML)
- Fallback: Enhanced OCR with image preprocessing
- Validation: Cross-check extracted fields
"""

import re
import os
import zlib
import base64
import struct
import hashlib
from io import BytesIO
from PIL import Image, ImageFilter, ImageEnhance

try:
    import pytesseract
    TESSERACT_AVAILABLE = True
    if os.name == "nt":
        pytesseract.pytesseract.tesseract_cmd = (
            r"C:\Program Files\Tesseract-OCR\tesseract.exe"
        )
except ImportError:
    TESSERACT_AVAILABLE = False

try:
    from pyzbar.pyzbar import decode as qr_decode
    PYZBAR_AVAILABLE = True
except Exception:
    PYZBAR_AVAILABLE = False


def decode_aadhaar_secure_qr(qr_data: str) -> dict | None:
    """
    Decode Aadhaar Secure QR code.
    
    Aadhaar QR v2 format:
    - Large integer (base-10 string)
    - Convert to bytes
    - Decompress with zlib
    - Parse fixed-length fields
    
    Returns extracted identity data or None.
    """
    try:
        if not qr_data or len(qr_data) < 100:
            return None

        # Try numeric QR (Aadhaar Secure QR v2)
        if qr_data.isdigit():
            raw_bytes = int(qr_data).to_bytes(
                (len(qr_data) * 10 // 24) + 1,
                byteorder="big"
            )

            try:
                decompressed = zlib.decompress(raw_bytes, 15)
                return _parse_aadhaar_xml(decompressed.decode("utf-8"))
            except Exception:
                pass

            try:
                decompressed = zlib.decompress(raw_bytes, -15)
                return _parse_aadhaar_xml(decompressed.decode("utf-8"))
            except Exception:
                pass

        # Try base64-encoded QR
        try:
            decoded = base64.b64decode(qr_data)
            decompressed = zlib.decompress(decoded)
            return _parse_aadhaar_xml(decompressed.decode("utf-8"))
        except Exception:
            pass

        # Try XML QR directly
        if "<" in qr_data and ">" in qr_data:
            return _parse_aadhaar_xml(qr_data)

        return None

    except Exception:
        return None


def _parse_aadhaar_xml(xml_text: str) -> dict | None:
    """Parse Aadhaar QR XML data."""
    try:
        data = {}

        # Extract attributes from XML
        name_match = re.search(r'name="([^"]+)"', xml_text, re.I)
        if not name_match:
            name_match = re.search(r'n="([^"]+)"', xml_text, re.I)
        if name_match:
            data["name"] = name_match.group(1)

        dob_match = re.search(r'dob="([^"]+)"', xml_text, re.I)
        if not dob_match:
            dob_match = re.search(r'd="([^"]+)"', xml_text, re.I)
        if dob_match:
            data["dob"] = dob_match.group(1)

        gender_match = re.search(r'gender="([^"]+)"', xml_text, re.I)
        if not gender_match:
            gender_match = re.search(r'g="([^"]+)"', xml_text, re.I)
        if gender_match:
            data["gender"] = gender_match.group(1)

        addr_parts = []
        for attr in ["house", "street", "lm", "loc", "vtc", "dist", "state", "pc"]:
            m = re.search(rf'{attr}="([^"]+)"', xml_text, re.I)
            if m:
                addr_parts.append(m.group(1))

        if addr_parts:
            data["address"] = ", ".join(addr_parts)

        uid_match = re.search(r'uid="([^"]+)"', xml_text, re.I)
        if uid_match:
            uid = uid_match.group(1)
            data["aadhaar_last4"] = uid[-4:] if len(uid) >= 4 else uid

        if data:
            data["source"] = "aadhaar_qr"
            return data

        return None

    except Exception:
        return None


def extract_qr_from_image(image_path: str) -> str | None:
    """Try to decode QR code from an image using pyzbar."""
    if not PYZBAR_AVAILABLE:
        return None

    try:
        img = Image.open(image_path)
        codes = qr_decode(img)

        if codes:
            return codes[0].data.decode("utf-8")

        # Try with grayscale
        gray = img.convert("L")
        codes = qr_decode(gray)

        if codes:
            return codes[0].data.decode("utf-8")

        return None

    except Exception:
        return None


def enhanced_ocr(image_path: str) -> dict:
    """
    Enhanced OCR with image preprocessing.
    
    Preprocessing pipeline:
    1. Convert to grayscale
    2. Enhance contrast
    3. Apply sharpening
    4. Threshold for binarization
    5. Multiple OCR passes
    """
    if not TESSERACT_AVAILABLE:
        return {
            "name": "Unknown",
            "dob": None,
            "age_over_18": False,
            "address_verified": False,
            "source": "ocr_unavailable"
        }

    try:
        img = Image.open(image_path)
        width, height = img.size

        # ─── Preprocessing ───────────────────
        gray = img.convert("L")
        enhancer = ImageEnhance.Contrast(gray)
        enhanced = enhancer.enhance(2.0)
        sharp = enhanced.filter(ImageFilter.SHARPEN)
        threshold = sharp.point(lambda x: 0 if x < 140 else 255)

        # ─── Full page OCR ───────────────────
        full_text = pytesseract.image_to_string(
            threshold, config="--psm 6"
        )

        # ─── Name region OCR ────────────────
        name_crop = img.crop((
            int(width * 0.25),
            int(height * 0.15),
            int(width * 0.80),
            int(height * 0.50)
        ))
        name_text = pytesseract.image_to_string(
            name_crop, config="--psm 6"
        )

        # ─── Extract Name ───────────────────
        name = "Unknown"
        for line in name_text.split("\n"):
            clean = line.strip()
            if re.fullmatch(r"[A-Za-z]{2,}\s[A-Za-z]{2,}(\s[A-Za-z]{2,})?", clean):
                name = clean
                break

        if name == "Unknown":
            match = re.search(r'([A-Z][a-z]+ [A-Z][a-z]+)', full_text)
            if match:
                name = match.group(1)

        # ─── Extract DOB / Age ──────────────
        dob = None
        age_over_18 = False

        dob_match = re.search(
            r'(\d{2})[/\-.](\d{2})[/\-.](\d{4})', full_text
        )
        if dob_match:
            day, month, year = dob_match.groups()
            dob = f"{year}-{month}-{day}"
            birth_year = int(year)
            if 2026 - birth_year >= 18:
                age_over_18 = True
        else:
            year_match = re.search(r'(19|20)\d{2}', full_text)
            if year_match:
                birth_year = int(year_match.group())
                if 1920 < birth_year < 2020 and 2026 - birth_year >= 18:
                    age_over_18 = True

        # ─── Extract Address ────────────────
        address_verified = False
        address_text = ""

        if "address" in full_text.lower():
            address_verified = True
            addr_match = re.search(
                r'(?:address|addr)[:\s]*(.+?)(?:\n\n|\Z)',
                full_text, re.I | re.S
            )
            if addr_match:
                address_text = addr_match.group(1).strip()

        # Check for state/pin patterns
        if re.search(r'\d{6}', full_text):
            address_verified = True

        return {
            "name": name,
            "dob": dob,
            "age_over_18": age_over_18,
            "address_verified": address_verified,
            "address": address_text,
            "source": "enhanced_ocr",
            "ocr_text": full_text[:500]
        }

    except Exception as e:
        return {
            "name": "Unknown",
            "dob": None,
            "age_over_18": False,
            "address_verified": False,
            "source": "ocr_error",
            "error": str(e)
        }


def process_identity_document(image_path: str) -> dict:
    """
    Master extraction pipeline.
    1. Try QR decode (Aadhaar Secure QR)
    2. Fall back to enhanced OCR
    3. Validate extracted data
    """
    result = {
        "name": "Unknown",
        "dob": None,
        "age_over_18": False,
        "address_verified": False,
        "address": "",
        "source": "none",
        "qr_decoded": False,
        "validation": {}
    }

    # ─── Step 1: Try QR ─────────────────
    qr_data = extract_qr_from_image(image_path)
    if qr_data:
        qr_result = decode_aadhaar_secure_qr(qr_data)
        if qr_result:
            result["qr_decoded"] = True
            result["name"] = qr_result.get("name", "Unknown")
            result["dob"] = qr_result.get("dob")
            result["address"] = qr_result.get("address", "")
            result["address_verified"] = bool(result["address"])
            result["source"] = "aadhaar_qr"

            # Calculate age from DOB
            if result["dob"]:
                try:
                    from datetime import datetime
                    for fmt in ["%d-%m-%Y", "%Y-%m-%d", "%d/%m/%Y"]:
                        try:
                            birth = datetime.strptime(result["dob"], fmt)
                            age = (datetime.utcnow() - birth).days // 365
                            result["age_over_18"] = age >= 18
                            break
                        except ValueError:
                            continue
                except Exception:
                    pass

    # ─── Step 2: Fallback OCR ───────────
    if not result["qr_decoded"]:
        ocr_result = enhanced_ocr(image_path)
        result.update(ocr_result)

    # ─── Step 3: Validate ───────────────
    result["validation"] = _validate_extraction(result)

    return result


def _validate_extraction(data: dict) -> dict:
    """Cross-check extracted fields for consistency."""
    checks = {}

    # Name validation
    name = data.get("name", "")
    checks["name_valid"] = (
        name != "Unknown"
        and len(name) >= 3
        and bool(re.match(r'^[A-Za-z\s]+$', name))
    )

    # DOB validation
    dob = data.get("dob")
    checks["dob_valid"] = bool(dob and len(dob) >= 8)

    # Address validation
    addr = data.get("address", "")
    checks["address_valid"] = len(addr) > 5

    # Overall confidence
    score = sum(1 for v in checks.values() if v)
    checks["confidence"] = round(score / len(checks), 2) if checks else 0

    return checks
