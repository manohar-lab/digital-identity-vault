from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

import random
import time
import shutil
import os
import re

import pytesseract
from PIL import Image

from cryptography.fernet import Fernet
from twilio.rest import Client


app = FastAPI()

# ---------------------------------
# WINDOWS TESSERACT PATH
# ---------------------------------
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


# ---------------------------------
# CORS (FIXED)
# ---------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------
# STORAGE
# ---------------------------------
vault = {}
requests_db = {}
verification_logs = []

if not os.path.exists("uploads"):
    os.mkdir("uploads")


# ---------------------------------
# CRYPTO
# ---------------------------------
SECRET = Fernet.generate_key()
cipher = Fernet(SECRET)


# ---------------------------------
# TWILIO (demo fallback)
# ---------------------------------
TWILIO_SID = "TWILIO_SID"
TWILIO_AUTH = "TWILIO_AUTH"
TWILIO_FROM = "+1xxxxxxx"


def send_sms(phone, code):
    try:
        client = Client(
            TWILIO_SID,
            TWILIO_AUTH
        )

        client.messages.create(
            body=f"ABC Bank requests verification. Approval code: {code}",
            from_=TWILIO_FROM,
            to=phone
        )

    except Exception:
        print("SMS simulation fallback")
        print("Approval Code:", code)


# ---------------------------------
# HEALTH
# ---------------------------------
@app.get("/")
def home():
    return {
        "project": "Digital Identity Vault",
        "status": "running"
    }


# ---------------------------------
# STRUCTURED DOCUMENT UPLOAD
# ---------------------------------
@app.post("/upload_document")
def upload_document(data: dict):

    user_id = data["user_id"]

    vault[user_id] = {
        "document": {
            "doc_type": data["doc_type"],

            "attributes": {
                "age_over_18":
                    data.get("age_over_18", False),

                "has_pan":
                    data.get("has_pan", False),

                "address_verified":
                    data.get("address_verified", False)
            },

            "verification_status": "pending",
            "verified_by": None,
            "signature": None
        }
    }

    return {
        "status": "uploaded"
    }


# ---------------------------------
# AADHAAR IMAGE + OCR UPLOAD
# ---------------------------------
@app.post("/upload_aadhaar")
async def upload_aadhaar(
    user_id: str,
    file: UploadFile = File(...)
):

    path = f"uploads/{file.filename}"

    with open(path, "wb") as buffer:
        shutil.copyfileobj(
            file.file,
            buffer
        )

    # OCR
    img = Image.open(path)

    text = pytesseract.image_to_string(
        img
    )

    print("OCR TEXT:")
    print(text)

    # -------------------------
    # crude extraction
    # -------------------------
    age_over_18 = False
    address_verified = False
    name = "Unknown"

    match = re.search(
        r'\b(19|20)\d\d\b',
        text
    )

    if match:
        birth_year = int(
            match.group()
        )

        if 2026 - birth_year >= 18:
            age_over_18 = True

    lines = text.split("\n")

    for line in lines:

        clean = line.strip()

        if (
            len(clean.split()) >= 2
            and clean.replace(" ", "").isalpha()
        ):
            name = clean
            break

    if "Address" in text:
        address_verified = True

    extracted = {
        "name": name,
        "age_over_18": age_over_18,
        "address_verified": address_verified
    }

    vault[user_id] = {

        "document": {

            "image_path": path,

            "ocr_text": text,

            "attributes": extracted,

            "verification_status": "pending",

            "verified_by": None,

            "signature": None
        }
    }

    return {
        "stored": True,
        "extracted": extracted
    }


# ---------------------------------
# GOVT ADMIN APPROVE
# ---------------------------------
@app.post("/admin/approve")
def admin_approve(data: dict):

    user_id = data["user_id"]

    if user_id not in vault:
        return {
            "error": "USER_NOT_FOUND"
        }

    signature = cipher.encrypt(
        b"gov_verified"
    ).decode()

    vault[user_id]["document"][
        "verification_status"
    ] = "verified"

    vault[user_id]["document"][
        "verified_by"
    ] = data["officer_id"]

    vault[user_id]["document"][
        "signature"
    ] = signature

    return {
        "status": "verified",
        "signature": signature
    }


# ---------------------------------
# BANK REQUEST
# ---------------------------------
@app.post("/request_verification")
def request_verification(data: dict):

    user_id = data["user_id"]

    if user_id not in vault:
        return {
            "error": "USER_NOT_FOUND"
        }

    if vault[user_id]["document"][
        "verification_status"
    ] != "verified":

        return {
            "error": "DOCUMENT_NOT_VERIFIED"
        }

    request_id = str(
        random.randint(
            10000,
            99999
        )
    )

    approval_code = str(
        random.randint(
            100000,
            999999
        )
    )

    requests_db[request_id] = {

        "user_id": user_id,

        "attribute":
            data["attribute"],

        "bank":
            data["bank"],

        "code":
            approval_code,

        "approved":
            False,

        "used":
            False,

        "created":
            time.time()
    }

    send_sms(
        data["phone"],
        approval_code
    )

    return {

        "request_id":
            request_id,

        "approval_code":
            approval_code
    }


# ---------------------------------
# USER CONSENT
# ---------------------------------
@app.post("/approve_request")
def approve_request(data: dict):

    request_id = data["request_id"]

    if request_id not in requests_db:
        return {
            "error": "INVALID_REQUEST"
        }

    req = requests_db[request_id]

    if req["used"]:
        return {
            "reason":
                "CODE_ALREADY_USED"
        }

    if time.time() - req["created"] > 60:
        return {
            "reason":
                "CODE_EXPIRED"
        }

    if data["code"] != req["code"]:
        return {
            "reason":
                "CONSENT_DENIED"
        }

    req["approved"] = True

    return {
        "approved": True
    }


# ---------------------------------
# SELECTIVE DISCLOSURE RESPONSE
# ---------------------------------
@app.get("/vault_response/{request_id}")
def vault_response(request_id: str):

    if request_id not in requests_db:
        return {
            "error":
                "INVALID_REQUEST"
        }

    req = requests_db[request_id]

    if not req["approved"]:
        return {
            "reason":
                "PENDING_USER_CONSENT"
        }

    if req["used"]:
        return {
            "reason":
                "TOKEN_REPLAY_BLOCKED"
        }

    req["used"] = True

    user = req["user_id"]

    attribute = req["attribute"]

    result = vault[user]["document"][
        "attributes"
    ].get(
        attribute,
        False
    )

    proof = cipher.encrypt(
        f"{attribute}:{result}:{time.time()}".encode()
    ).decode()

    verification_logs.append({

        "bank":
            req["bank"],

        "user":
            user,

        "attribute":
            attribute,

        "result":
            result,

        "timestamp":
            time.time()
    })

    return {

        "proof":
            proof,

        "verified":
            result
    }


# ---------------------------------
# AUDIT LOGS
# ---------------------------------
@app.get("/audit_logs")
def audit_logs():

    return {
        "logs":
            verification_logs
    }