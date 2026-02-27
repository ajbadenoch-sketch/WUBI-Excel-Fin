import os
import secrets

SECRET_KEY = os.getenv("SECRET_KEY", secrets.token_urlsafe(32))
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./vida_control.db")
