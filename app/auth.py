from datetime import datetime, timedelta
import hashlib
import hmac
import json
import base64
from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.config import SECRET_KEY, ACCESS_TOKEN_EXPIRE_MINUTES
from app.database import get_db
from app.models import User


def hash_password(password: str) -> str:
    salt = SECRET_KEY[:16]
    return hashlib.pbkdf2_hmac(
        'sha256', password.encode(), salt.encode(), 100000
    ).hex()


def verify_password(plain: str, hashed: str) -> bool:
    return hash_password(plain) == hashed


def _b64encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode()


def _b64decode(s: str) -> bytes:
    padding = 4 - len(s) % 4
    if padding != 4:
        s += '=' * padding
    return base64.urlsafe_b64decode(s)


def create_access_token(data: dict) -> str:
    payload = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload["exp"] = expire.isoformat()
    payload_bytes = json.dumps(payload).encode()
    payload_b64 = _b64encode(payload_bytes)
    sig = hmac.new(SECRET_KEY.encode(), payload_bytes, hashlib.sha256).hexdigest()
    return f"{payload_b64}.{sig}"


def _decode_token(token: str) -> dict:
    parts = token.split(".")
    if len(parts) != 2:
        return None
    payload_b64, sig = parts
    payload_bytes = _b64decode(payload_b64)
    expected_sig = hmac.new(SECRET_KEY.encode(), payload_bytes, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected_sig):
        return None
    payload = json.loads(payload_bytes)
    exp = datetime.fromisoformat(payload["exp"])
    if datetime.utcnow() > exp:
        return None
    return payload


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=303, headers={"Location": "/login"})
    payload = _decode_token(token)
    if not payload:
        raise HTTPException(status_code=303, headers={"Location": "/login"})
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=303, headers={"Location": "/login"})
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=303, headers={"Location": "/login"})
    return user


def get_optional_user(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("access_token")
    if not token:
        return None
    payload = _decode_token(token)
    if not payload:
        return None
    user_id = payload.get("sub")
    if user_id is None:
        return None
    return db.query(User).filter(User.id == user_id).first()
