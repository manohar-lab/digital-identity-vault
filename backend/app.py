from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

import random
import time
import shutil
import os

from cryptography.fernet import Fernet
from twilio.rest import Client

app = FastAPI()

# -------------------------
# CORS FOR REACT FRONTEND
# -------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# -------------------------
# STORAGE
# -------------------------
vault = {}
requests_db = {}

if not os.path.exists("uploads"):
    os.mkdir("uploads")

# -------------------------
# CRYPTO SIGNATURE
# -------------------------
SECRET = Fernet.generate_key()
cipher = Fernet(SECRET)

# -------------------------
# TWILIO (replace later)
# -------------------------
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
        # fallback for demo
        print("SMS simulation fallback")
        print("Approval Code:", code)


# -------------------------
# HEALTH
# -------------------------
@app.get("/")
def home():
    return {
        "project": "Digital Identity Vault",
        "status": "running"
    }


# -------------------------
# STRUCTURED DOC UPLOAD
# -------------------------
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

            "verification_status":
                "pending",

            "verified_by":
                None,

            "signature":
                None
        }
    }

    return {
        "status": "uploaded",
        "message": "Pending admin verification"
    }


# -------------------------
# IMAGE AADHAAR UPLOAD
# -------------------------
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

    # simulated OCR extraction
    extracted = {
        "name": "Naveen",
        "age_over_18": True,
        "address_verified": True
    }

    vault[user_id] = {
        "document": {
            "image_path": path,

            "attributes": extracted,

            "verification_status":
                "pending",

            "verified_by":
                None,

            "signature":
                None
        }
    }

    return {
        "stored": True
    }


# -------------------------
# GOVT ADMIN APPROVAL
# -------------------------
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
        "approved_by": data["officer_id"],
        "signature": signature
    }


# -------------------------
# BANK REQUEST
# -------------------------
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
        random.randint(10000, 99999)
    )

    approval_code = str(
        random.randint(100000, 999999)
    )

    requests_db[request_id] = {

        "user_id":
            user_id,

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

    # FIXED: return approval code
    return {
        "request_id": request_id,
        "approval_code": approval_code,
        "message":
            f"{data['bank']} requests {data['attribute']}"
    }


# -------------------------
# USER CONSENT
# -------------------------
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
            "verified": False,
            "reason": "CODE_ALREADY_USED"
        }

    if time.time() - req["created"] > 60:
        return {
            "verified": False,
            "reason": "CODE_EXPIRED"
        }

    if data["code"] != req["code"]:
        return {
            "verified": False,
            "reason": "CONSENT_DENIED"
        }

    req["approved"] = True

    return {
        "approved": True
    }


# -------------------------
# SELECTIVE DISCLOSURE
# -------------------------
@app.get("/vault_response/{request_id}")
def vault_response(request_id: str):

    if request_id not in requests_db:
        return {
            "error": "INVALID_REQUEST"
        }

    req = requests_db[request_id]

    if not req["approved"]:
        return {
            "verified": False,
            "reason": "PENDING_USER_CONSENT"
        }

    if req["used"]:
        return {
            "verified": False,
            "reason": "TOKEN_REPLAY_BLOCKED"
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

    return {
        "proof":
            "VALID_ATTRIBUTE_PROOF",

        "verified":
            result
    }