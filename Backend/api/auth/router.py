from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db.session import get_db
from db.models import User
from db.enums import UserRole
from api.auth.schemas import RegisterRequest, LoginRequest, TokenResponse
from api.auth.utils import hash_password, verify_password, create_access_token

router = APIRouter()


@router.post("/register", response_model=TokenResponse)
def register(request: RegisterRequest, db: Session = Depends(get_db)):

    # Vérifier si l'email existe déjà
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé.")

    # Vérifier que le rôle est valide
    try:
        role = UserRole(request.role)
    except ValueError:
        raise HTTPException(status_code=400, detail="Rôle invalide. Choisir PROFESSOR ou STUDENT.")

    # Créer l'utilisateur
    user = User(
        email=request.email,
        hashed_password=hash_password(request.password),
        full_name=request.full_name,
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Générer le token
    token = create_access_token(str(user.id), user.email, user.role.value)

    return TokenResponse(
        access_token=token,
        role=user.role.value,
        full_name=user.full_name,
    )


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):

    user = db.query(User).filter(User.email == request.email).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect.")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Compte désactivé.")

    token = create_access_token(str(user.id), user.email, user.role.value)

    return TokenResponse(
        access_token=token,
        role=user.role.value,
        full_name=user.full_name,
    )
