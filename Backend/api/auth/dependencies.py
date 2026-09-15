from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import jwt

from db.session import get_db
from db.models import User
from api.auth.utils import decode_access_token

security = HTTPBearer()


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)) -> User:
    """Décode le JWT et retourne l'utilisateur depuis la base."""
    token = credentials.credentials
    try:
        payload = decode_access_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide.")

    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Utilisateur introuvable ou désactivé.")

    return user


security_optional = HTTPBearer(auto_error=False)

def get_current_user_optional(credentials: HTTPAuthorizationCredentials | None = Depends(security_optional), db: Session = Depends(get_db)) -> User | None:
    """Retourne l'utilisateur s'il est authentifié, sinon None (sans bloquer)."""
    if not credentials:
        return None
    try:
        payload = decode_access_token(credentials.credentials)
        user = db.query(User).filter(User.id == payload["sub"]).first()
        return (
            user
            if user and user.is_active
            else None
        )
    except Exception:
        return None


def require_role(required_role: str):
    """Vérifie que l'utilisateur a le bon rôle."""
    def check_role(user: User = Depends(get_current_user)):
        if user.role.value != required_role:
            raise HTTPException(status_code=403, detail=f"Accès réservé au rôle {required_role}.")
        return user
    return check_role