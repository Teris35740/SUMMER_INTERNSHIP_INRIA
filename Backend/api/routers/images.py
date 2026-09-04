import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from api.auth.dependencies import get_current_user, require_role
from db.models import Patient, PatientImage, User
from db.session import get_db

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parents[3]
IMAGE_DIR = BASE_DIR / "uploads" / "patient_images"

ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
}


def _get_patient(patient_id: str, db: Session) -> Patient:
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()

    if not patient:
        raise HTTPException(
            status_code=404,
            detail=f"Patient {patient_id} introuvable.",
        )

    return patient


def _serialize_image(image: PatientImage) -> dict:
    return {
        "id": str(image.id),
        "patient_id": image.patient.patient_id,
        "image_type": image.image_type,
        "file_name": image.file_name,
        "mime_type": image.mime_type,
        "file_size_bytes": image.file_size_bytes,
        "description": image.description,
        "reveal_policy": image.reveal_policy,
        "created_at": image.created_at.isoformat(),
    }


@router.post("/patients/{patient_id}/images", status_code=201)
def upload_patient_image(
    patient_id: str,
    file: UploadFile = File(...),
    image_type: str = Form(...),
    description: str | None = Form(None),
    reveal_policy: str = Form("direct_if_asked"),
    current_user: User = Depends(require_role("PROFESSOR")),
    db: Session = Depends(get_db),
):
    patient = _get_patient(patient_id, db)

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Format d'image non supporté.",
        )

    original_name = Path(file.filename or "image").name
    extension = Path(original_name).suffix.lower()

    if not extension:
        raise HTTPException(
            status_code=400,
            detail="Le fichier doit avoir une extension.",
        )

    stored_name = f"{uuid.uuid4().hex}{extension}"
    patient_directory = IMAGE_DIR / patient.patient_id
    patient_directory.mkdir(parents=True, exist_ok=True)

    file_path = patient_directory / stored_name

    try:
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        image = PatientImage(
            patient_id=patient.id,
            uploaded_by=current_user.id,
            image_type=image_type,
            file_path=str(file_path),
            file_name=original_name,
            mime_type=file.content_type,
            file_size_bytes=file_path.stat().st_size,
            description=description,
            reveal_policy=reveal_policy,
        )

        db.add(image)
        db.commit()
        db.refresh(image)

        return _serialize_image(image)

    except Exception as error:
        db.rollback()

        if file_path.exists():
            file_path.unlink()

        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de l'upload de l'image : {error}",
        )


@router.get("/patients/{patient_id}/images")
def list_patient_images(
    patient_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    patient = _get_patient(patient_id, db)

    images = (
        db.query(PatientImage)
        .filter(PatientImage.patient_id == patient.id)
        .order_by(PatientImage.created_at.desc())
        .all()
    )

    return [_serialize_image(image) for image in images]


@router.get("/patients/{patient_id}/images/{image_id}")
def get_patient_image(
    patient_id: str,
    image_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    patient = _get_patient(patient_id, db)

    image = (
        db.query(PatientImage)
        .filter(
            PatientImage.id == image_id,
            PatientImage.patient_id == patient.id,
        )
        .first()
    )

    if not image:
        raise HTTPException(
            status_code=404,
            detail="Image introuvable.",
        )

    file_path = Path(image.file_path)

    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Fichier image introuvable.",
        )

    return FileResponse(
        path=file_path,
        media_type=image.mime_type,
        filename=image.file_name,
    )


@router.delete("/patients/{patient_id}/images/{image_id}")
def delete_patient_image(
    patient_id: str,
    image_id: uuid.UUID,
    current_user: User = Depends(require_role("PROFESSOR")),
    db: Session = Depends(get_db),
):
    patient = _get_patient(patient_id, db)

    image = (
        db.query(PatientImage)
        .filter(
            PatientImage.id == image_id,
            PatientImage.patient_id == patient.id,
        )
        .first()
    )

    if not image:
        raise HTTPException(
            status_code=404,
            detail="Image introuvable.",
        )

    try:
        file_path = Path(image.file_path)

        if file_path.exists():
            file_path.unlink()

        db.delete(image)
        db.commit()

        return {
            "id": str(image_id),
            "status": "deleted",
        }

    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la suppression de l'image : {error}",
        )