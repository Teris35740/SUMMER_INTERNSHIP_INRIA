import os
import re
import json
import glob
import logging
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Optional
from pathlib import Path

from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File
import shutil
from sqlalchemy.orm import Session
from sqlalchemy import or_

from db.session import get_db
from db.models import Patient, User
from db.enums import UserRole
from api.auth.dependencies import get_current_user, require_role
from api.schemas import (
    PatientSummary,
    CreatePatientRequest,
    CreatePatientResponse,
    DeletePatientResponse,
)
from core.rag.chunking import build_chunk_records_from_dict, build_chunk_records_from_pdf
from core.rag.embedding import embedding_db, store_in_weaviate
import weaviate.classes.query as wvq
from core.config import get_weaviate_client, WEAVIATE_COLLECTION

router = APIRouter()
logger = logging.getLogger(__name__)

PATIENT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'Document_patient')
DOCUMENT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'Document_scientifique')

FACT_ID_PREFIXES = {
    "chief_complaint": "cc",
    "history": "h",
    "risk_factors": "rf",
    "travel_history": "th",
    "family_history": "fh",
    "vitals": "v",
    "past_medical_history": "pmh",
    "treatments": "t",
    "allergies": "a",
    "social_history": "sh",
    "surgical_history": "suh",
}


def _extract_patient_num(patient_id_str: str) -> Optional[int]:
    """Extrait le numéro du patient depuis une chaîne (ex: PAT_001 -> 1, 1 -> 1, PAT_12 -> 12)."""
    match = re.search(r"(\d+)", str(patient_id_str))
    if match:
        return int(match.group(1))
    return None


def _format_patient_id(num: int) -> str:
    return f"PAT_{num:03d}"


def _get_next_patient_num(db: Session) -> int:
    """Calcule le prochain numéro de patient disponible."""
    max_num = 0

    patients_in_db = db.query(Patient.patient_id).all()
    for (pid,) in patients_in_db:
        num = _extract_patient_num(pid)
        if num and num > max_num:
            max_num = num

    # Bloc a supprimé car le but est de rester avec juste la db et plus du tout les fichiers json
    pattern = os.path.join(PATIENT_DIR, "patient_*.json")
    for filepath in glob.glob(pattern):
        filename = os.path.basename(filepath)
        num = _extract_patient_num(filename)
        if num and num > max_num:
            max_num = num

    return max_num + 1


def _build_patient_json(payload: CreatePatientRequest, patient_id: str) -> dict:
    chief_complaint = {
        "information": payload.chief_complaint.information,
        "reveal_policy": payload.chief_complaint.reveal_policy,
        "fact_id": "cc1",
    }

    array_sections = {}
    for section_name in [
        "history", "risk_factors", "travel_history", "family_history",
        "vitals", "past_medical_history", "treatments", "allergies",
        "social_history", "surgical_history",
    ]:
        facts = getattr(payload, section_name, [])
        prefix = FACT_ID_PREFIXES[section_name]
        array_sections[section_name] = [
            {
                "information": fact.information,
                "reveal_policy": fact.reveal_policy,
                "fact_id": f"{prefix}{i + 1}",
            }
            for i, fact in enumerate(facts)
        ]

    return {
        "patient": {
            "identity": {
                "patient_id": patient_id,
                "age": payload.identity.age,
                "gender": payload.identity.gender,
                "patient_attitude": {
                    "anxiety": round(payload.identity.patient_attitude.anxiety, 2),
                    "precision": round(payload.identity.patient_attitude.precision, 2),
                    "cooperativeness": round(payload.identity.patient_attitude.cooperativeness, 2),
                },
            },
            "chief_complaint": chief_complaint,
            **array_sections,
        },
        "metadata": {
            "difficulty": payload.metadata.difficulty,
            "specialty": payload.metadata.specialty,
            "expected_diagnosis": payload.metadata.expected_diagnosis,
            "alternative_diagnoses": payload.metadata.alternative_diagnoses,
            "red_flags": payload.metadata.red_flags,
            **({"expected_treatment": {
                "molecules": [
                    {
                        "name": mol.name,
                        "dosage": mol.dosage,
                        "route": mol.route,
                        "duration": mol.duration,
                    }
                    for mol in payload.metadata.expected_treatment.molecules
                ],
                "contraindications_to_check": payload.metadata.expected_treatment.contraindications_to_check,
            }} if payload.metadata.expected_treatment else {}),
        },
    }


def _patient_to_summary(p: Patient) -> PatientSummary:
    doc = p.patient_data or {}
    patient_data = doc.get("patient", doc)
    identity = patient_data.get("identity", {})
    metadata = doc.get("metadata", {})
    chief = patient_data.get("chief_complaint", {})

    num = _extract_patient_num(p.patient_id) or 0

    return PatientSummary(
        num=num,
        patient_id=p.patient_id,
        age=identity.get("age"),
        gender=identity.get("gender") or identity.get("sex"),
        difficulty=p.difficulty or metadata.get("difficulty"),
        specialty=p.specialty or metadata.get("specialty"),
        chief_complaint=chief.get("information"),
    )


def _delete_patient_chunks(patient_id: str) -> int:
    """Supprime tous les chunks Weaviate associés à un patient_id."""
    try:
        client = get_weaviate_client()
        if not client.collections.exists(WEAVIATE_COLLECTION):
            return 0

        collection = client.collections.get(WEAVIATE_COLLECTION)
        result = collection.data.delete_many(
            where=wvq.Filter.by_property("metadata_json").like(f"*{patient_id}*")
        )
        deleted_count = result.successful if hasattr(result, 'successful') else 0
        logger.info("Deleted %d Weaviate chunks for patient %s", deleted_count, patient_id)
        return deleted_count
    except Exception as e:
        logger.warning("Weaviate deletion error for %s: %s", patient_id, e)
        return 0


def _delete_document_chunks(filename: str) -> int:
    """Supprime tous les chunks Weaviate associés à un document PDF."""
    try:
        client = get_weaviate_client()
        if not client.collections.exists(WEAVIATE_COLLECTION):
            return 0
        collection = client.collections.get(WEAVIATE_COLLECTION)
        result = collection.data.delete_many(
            where=wvq.Filter.by_property("metadata_json").like(f"*{filename}*")
        )
        return result.successful if hasattr(result, 'successful') else 0
    except Exception:
        return 0



@router.get("/patients", response_model=List[PatientSummary])
def list_patients(
    difficulty: Optional[str] = Query(None, description="Filtrer par difficulté (ex: facile, moyen, difficile)"),
    specialty: Optional[str] = Query(None, description="Filtrer par spécialité médicale"),
    db: Session = Depends(get_db),
):
    """Liste tous les patients non expirés avec filtrage optionnel."""
    now = datetime.now(timezone.utc)
    query = db.query(Patient).filter(
        or_(
            Patient.is_temporary.is_(False),
            Patient.expires_at.is_(None),
            Patient.expires_at > now,
        )
    )

    if difficulty:
        query = query.filter(Patient.difficulty.ilike(f"%{difficulty}%"))
    if specialty:
        query = query.filter(Patient.specialty.ilike(f"%{specialty}%"))

    patients = query.order_by(Patient.patient_id.asc()).all()

    if not patients and not difficulty and not specialty:
        return _fallback_load_patients_from_files()

    return [_patient_to_summary(p) for p in patients]


@router.get("/patients/grouped", response_model=Dict[str, List[PatientSummary]])
def list_patients_grouped(db: Session = Depends(get_db)):
    """Retourne les patients non expirés regroupés par spécialité médicale."""
    now = datetime.now(timezone.utc)
    patients = (
        db.query(Patient)
        .filter(
            or_(
                Patient.is_temporary.is_(False),
                Patient.expires_at.is_(None),
                Patient.expires_at > now,
            )
        )
        .order_by(Patient.patient_id.asc())
        .all()
    )

    if not patients:
        fallback_list = _fallback_load_patients_from_files()
        grouped = defaultdict(list)
        for p in fallback_list:
            grouped[p.specialty or "Autre"].append(p)
        return dict(sorted(grouped.items()))

    grouped = defaultdict(list)
    for p in patients:
        summary = _patient_to_summary(p)
        spec = summary.specialty or "Autre"
        grouped[spec].append(summary)

    return dict(sorted(grouped.items()))


@router.get("/patients/documents")
def list_patient_documents():
    """Liste tous les documents PDF dans le répertoire Document_scientifique."""
    try:
        pattern = os.path.join(DOCUMENT_DIR, "*.pdf")
        documents = []
        for filepath in sorted(glob.glob(pattern)):
            filename = os.path.basename(filepath)
            size = os.path.getsize(filepath)
            documents.append({"filename": filename, "size": size})
        return documents
    except Exception as e:
        logger.exception("Error listing documents")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des documents : {str(e)}")


@router.post("/patients/upload-pdf", status_code=201)
def upload_patient_pdf(file: UploadFile = File(...),current_user: User = Depends(require_role("PROFESSOR"))):
    """Upload et ingestion d'un document scientifique (PROFESSOR only)."""
    try:
        os.makedirs(DOCUMENT_DIR, exist_ok=True)
        filename = file.filename or "uploaded_document.pdf"
        pdf_path = os.path.join(DOCUMENT_DIR, filename)

        with open(pdf_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        logger.info("Uploaded PDF saved to %s by %s", pdf_path, current_user.email)

        chunk_records = build_chunk_records_from_pdf(pdf_path, method="parent_child")
        if chunk_records:
            chunks = [r["content"] for r in chunk_records]
            embeddings = embedding_db(chunks)
            store_in_weaviate(chunk_records, embeddings)
            logger.info("RAG ingestion OK for uploaded PDF %s (%d chunks)", filename, len(chunk_records))

        return {"filename": filename, "status": "uploaded and ingested"}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error uploading PDF %s", file.filename)
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'upload du PDF : {str(e)}")


@router.delete("/patients/documents/{filename}")
def delete_patient_document(filename: str,current_user: User = Depends(require_role("PROFESSOR"))):
    """Supprime un document PDF et ses chunks vectoriels associés (PROFESSOR only)."""
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Nom de fichier invalide.")

    pdf_path = os.path.join(DOCUMENT_DIR, filename)
    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail=f"Document {filename} introuvable.")

    try:
        deleted_chunks = _delete_document_chunks(filename)
        os.remove(pdf_path)
        logger.info("Deleted document %s by professor %s", filename, current_user.email)
        return {"filename": filename, "status": "deleted", "deleted_chunks": deleted_chunks}
    except Exception as e:
        logger.exception("Error deleting document %s", filename)
        raise HTTPException(status_code=500, detail=f"Erreur lors de la suppression du document : {str(e)}")


@router.post("/patients", response_model=CreatePatientResponse, status_code=201)
def create_patient(payload: CreatePatientRequest,current_user: User = Depends(get_current_user),db: Session = Depends(get_db),):
    """Crée un patient.

    - PROFESSOR : patient permanent (expires_at = None)
    - STUDENT : patient temporaire (expires_at = now + 48h)
    """
    try:
        next_num = _get_next_patient_num(db)
        patient_id = _format_patient_id(next_num)

        is_temporary = (current_user.role == UserRole.STUDENT or str(current_user.role) == "STUDENT")
        expires_at = (datetime.now(timezone.utc) + timedelta(hours=48)) if is_temporary else None

        patient_json = _build_patient_json(payload, patient_id)

        new_patient = Patient(
            patient_id=patient_id,
            created_by=current_user.id,
            patient_data=patient_json,
            is_temporary=is_temporary,
            expires_at=expires_at,
            difficulty=payload.metadata.difficulty,
            specialty=payload.metadata.specialty,
        )
        db.add(new_patient)
        db.commit()
        db.refresh(new_patient)

        logger.info(
            "Patient %s created by %s (%s). Temporary=%s, Expires=%s",
            patient_id,
            current_user.email,
            current_user.role.value,
            is_temporary,
            expires_at,
        )

        try:
            chunk_records = build_chunk_records_from_dict(patient_json, source_file=f"db_{patient_id}")
            if chunk_records:
                chunks = [r["content"] for r in chunk_records]
                embeddings = embedding_db(chunks)
                store_in_weaviate(chunk_records, embeddings)
                logger.info("Ingested %d chunks into Weaviate for %s", len(chunks), patient_id)
        except Exception as e:
            logger.warning("Weaviate vectorization warning for %s: %s", patient_id, e)

        return CreatePatientResponse(
            patient_num=next_num,
            patient_id=patient_id,
            status="created",
        )

    except Exception as e:
        db.rollback()
        logger.exception("Error creating patient")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création du patient : {str(e)}")



@router.get("/patients/{patient_id}")
def get_patient(patient_id: str, db: Session = Depends(get_db)):
    """Retourne les détails complets (JSONB) d'un patient."""
    now = datetime.now(timezone.utc)

    target_id = patient_id
    num = _extract_patient_num(patient_id)
    if num is not None and not patient_id.startswith("PAT_"):
        target_id = _format_patient_id(num)

    patient = db.query(Patient).filter(
        or_(Patient.patient_id == target_id, Patient.patient_id == patient_id)
    ).first()

    if not patient:
        if num is not None:
            file_data = _fallback_get_patient_file(num)
            if file_data:
                return file_data
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} introuvable.")

    if patient.is_temporary and patient.expires_at and patient.expires_at <= now:
        raise HTTPException(status_code=404, detail="Ce patient temporaire a expiré.")

    return patient.patient_data


@router.delete("/patients/{patient_id}", response_model=DeletePatientResponse)
def delete_patient(patient_id: str, current_user: User = Depends(require_role("PROFESSOR")), db: Session = Depends(get_db),):
    """Supprime un patient (PROFESSOR only) : Weaviate + Fichiers + PostgreSQL."""
    num = _extract_patient_num(patient_id)
    target_id = _format_patient_id(num) if (num is not None and not patient_id.startswith("PAT_")) else patient_id

    patient = db.query(Patient).filter(
        or_(Patient.patient_id == target_id, Patient.patient_id == patient_id)
    ).first()

    if not patient and num is None:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} introuvable.")

    deleted_chunks = 0
    actual_patient_id = patient.patient_id if patient else (target_id or patient_id)
    actual_num = num or _extract_patient_num(actual_patient_id) or 0

    try:
        deleted_chunks = _delete_patient_chunks(actual_patient_id)

        if num is not None:
            for pattern in [f"patient_{num:02d}.json", f"patient_{num}.json", f"patient_{num:03d}.json"]:
                p_file = os.path.join(PATIENT_DIR, pattern)
                if os.path.exists(p_file):
                    try:
                        os.remove(p_file)
                        logger.info("Deleted physical JSON file: %s", p_file)
                    except Exception as fe:
                        logger.warning("Could not delete file %s: %s", p_file, fe)

        if patient:
            db.delete(patient)
            db.commit()
            logger.info("Deleted patient %s from PostgreSQL by professor %s", actual_patient_id, current_user.email)

        return DeletePatientResponse(
            patient_num=actual_num,
            patient_id=actual_patient_id,
            status="deleted",
            deleted_chunks=deleted_chunks,
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.exception("Error deleting patient %s", actual_patient_id)
        raise HTTPException(status_code=500, detail=f"Erreur lors de la suppression du patient : {str(e)}")


def _fallback_load_patients_from_files() -> List[PatientSummary]:
    patients = []
    pattern = os.path.join(PATIENT_DIR, "patient_*.json")
    for filepath in sorted(glob.glob(pattern)):
        filename = os.path.basename(filepath)
        num = _extract_patient_num(filename)
        if num is None:
            continue
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                doc = json.load(f)
            pdata = doc.get("patient", doc)
            identity = pdata.get("identity", {})
            metadata = doc.get("metadata", {})
            chief = pdata.get("chief_complaint", {})
            patients.append(
                PatientSummary(
                    num=num,
                    patient_id=identity.get("patient_id", _format_patient_id(num)),
                    age=identity.get("age"),
                    gender=identity.get("gender") or identity.get("sex"),
                    difficulty=metadata.get("difficulty"),
                    specialty=metadata.get("specialty"),
                    chief_complaint=chief.get("information"),
                )
            )
        except Exception:
            continue
    return patients


def _fallback_get_patient_file(num: int) -> Optional[dict]:
    for pattern in [f"patient_{num:02d}.json", f"patient_{num}.json", f"patient_{num:03d}.json"]:
        filepath = os.path.join(PATIENT_DIR, pattern)
        if os.path.exists(filepath):
            with open(filepath, "r", encoding="utf-8") as f:
                return json.load(f)
    return None
