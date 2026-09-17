import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from api.auth.dependencies import get_current_user, get_current_user_optional, require_role
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
        "fact_id": image.fact_id,
        "image_type": image.image_type,
        "file_name": image.file_name,
        "mime_type": image.mime_type,
        "file_size_bytes": image.file_size_bytes,
        "description": image.description,
        "reveal_policy": image.reveal_policy,
        "created_at": image.created_at.isoformat() if image.created_at else None,
        "url": f"/api/patients/{image.patient.patient_id}/images/{image.id}",
    }


def _attach_image_to_patient_data(patient_data: dict, fact_id: str, image_dict: dict) -> bool:
    """Parcourt les sections cliniques du patient_data pour lier l'image au fact_id correspondant."""
    if not patient_data or not fact_id:
        return False

    patient_root = patient_data.get("patient", patient_data)
    sections = [
        "chief_complaint", "history", "risk_factors", "travel_history",
        "family_history", "vitals", "past_medical_history", "treatments",
        "allergies", "social_history", "surgical_history"
    ]

    updated = False
    for sec in sections:
        items = patient_root.get(sec)
        if isinstance(items, dict):
            items = [items]
        if isinstance(items, list):
            for item in items:
                if isinstance(item, dict) and item.get("fact_id") == fact_id:
                    item["image"] = image_dict
                    updated = True
    return updated


@router.post("/patients/{patient_id}/images", status_code=201)
def upload_patient_image(
    patient_id: str,
    file: UploadFile = File(...),
    image_type: str = Form(...),
    description: str | None = Form(None),
    reveal_policy: str = Form("direct_if_asked"),
    fact_id: str | None = Form(None),
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
            fact_id=fact_id.strip() if fact_id else None,
            image_type=image_type,
            file_path=str(file_path),
            file_name=original_name,
            mime_type=file.content_type,
            file_size_bytes=file_path.stat().st_size,
            description=description,
            reveal_policy=reveal_policy,
        )

        db.add(image)
        db.flush()

        serialized = _serialize_image(image)

        # Synchroniser dans patient_data si un fact_id est ciblé
        if fact_id and patient.patient_data:
            img_ref = {
                "id": str(image.id),
                "fact_id": fact_id,
                "image_type": image.image_type,
                "file_name": image.file_name,
                "description": image.description,
                "url": serialized["url"],
            }
            if _attach_image_to_patient_data(patient.patient_data, fact_id, img_ref):
                flag_modified(patient, "patient_data")

        db.commit()
        db.refresh(image)

        return serialized

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
    fact_id: str | None = None,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    patient = _get_patient(patient_id, db)

    query = db.query(PatientImage).filter(PatientImage.patient_id == patient.id)
    if fact_id:
        query = query.filter(PatientImage.fact_id == fact_id)

    images = query.order_by(PatientImage.created_at.desc()).all()

    return [_serialize_image(image) for image in images]


@router.get("/patients/{patient_id}/images/{image_id}")
def get_patient_image(
    patient_id: str,
    image_id: uuid.UUID,
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
    if not file_path.is_absolute():
        file_path = BASE_DIR / file_path

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