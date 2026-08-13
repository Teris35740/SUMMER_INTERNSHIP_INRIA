import os
import re
import json
import glob
import logging
from collections import defaultdict
from fastapi import APIRouter, HTTPException
from typing import List, Dict
from api.schemas import PatientSummary, CreatePatientRequest, CreatePatientResponse
from core.utils.helpers import load_patient_data

router = APIRouter()
logger = logging.getLogger(__name__)

PATIENT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'Document_patient')

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

def _get_next_patient_num() -> int:
    """Scan Document_patient/ to find the next available patient number."""
    pattern = os.path.join(PATIENT_DIR, "patient_*.json")
    nums = []
    for filepath in glob.glob(pattern):
        filename = os.path.basename(filepath)
        match = re.match(r"patient_(\d+)\.json", filename)
        if match:
            nums.append(int(match.group(1)))
    return max(nums) + 1 if nums else 1


def _build_patient_json(payload: CreatePatientRequest, patient_num: int) -> dict:
    """Build the full patient JSON with auto-generated patient_id and fact_ids."""
    patient_id = f"PAT_{patient_num:03d}"

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
        },
    }


def _ingest_patient_rag(json_path: str):
    """Run the existing RAG pipeline: chunking → embedding → Weaviate storage."""
    from core.rag.chunking import build_chunk_records_from_json
    from core.rag.embedding import embedding_db, store_in_weaviate

    chunk_records = build_chunk_records_from_json(json_path)
    if chunk_records:
        chunks = [r["content"] for r in chunk_records]
        embeddings = embedding_db(chunks)
        store_in_weaviate(chunk_records, embeddings)
        logger.info("RAG ingestion OK for %s (%d chunks)", os.path.basename(json_path), len(chunk_records))


def get_patient_id_from_num(patient_num: int) -> str:
    return f"PAT_{patient_num:03d}"

def _load_all_patients() -> List[PatientSummary]:
    """Charge tous les patients depuis le dossier Document_patient."""
    patients = []
    pattern = os.path.join(PATIENT_DIR, "patient_*.json")
    
    for filepath in sorted(glob.glob(pattern)):
        filename = os.path.basename(filepath)
        try:
            num_str = filename.replace("patient_", "").replace(".json", "")
            num = int(num_str)
        except ValueError:
            continue
        
        patient_id = get_patient_id_from_num(num)
        data = load_patient_data(patient_id)
        if not data:
            continue
            
        identity = data.get("patient", {}).get("identity", {})
        metadata = data.get("metadata", {})
        chief = data.get("patient", {}).get("chief_complaint", {})
        
        patients.append(PatientSummary(
            num=num,
            patient_id=identity.get("patient_id", patient_id),
            age=identity.get("age"),
            gender=identity.get("gender"),
            difficulty=metadata.get("difficulty"),
            specialty=metadata.get("specialty"),
            chief_complaint=chief.get("information"),
        ))
    
    return patients

@router.get("/patients", response_model=List[PatientSummary])
def list_patients():
    return _load_all_patients()

@router.get("/patients/grouped", response_model=Dict[str, List[PatientSummary]])
def list_patients_grouped():
    """Retourne les patients regroupés par spécialité médicale."""
    patients = _load_all_patients()
    grouped = defaultdict(list)
    
    for patient in patients:
        specialty = patient.specialty or "Autre"
        grouped[specialty].append(patient)
    
    # Trier les spécialités alphabétiquement
    return dict(sorted(grouped.items()))


@router.post("/patients", response_model=CreatePatientResponse, status_code=201)
def create_patient(payload: CreatePatientRequest):
    """Create a new patient JSON file and run RAG ingestion synchronously."""
    try:
        next_num = _get_next_patient_num()
        patient_id = f"PAT_{next_num:03d}"

        patient_json = _build_patient_json(payload, next_num)

        json_path = os.path.join(PATIENT_DIR, f"patient_{next_num:02d}.json")
        os.makedirs(PATIENT_DIR, exist_ok=True)
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(patient_json, f, ensure_ascii=False, indent=4)

        logger.info("Patient %s saved to %s", patient_id, json_path)

        _ingest_patient_rag(json_path)

        return CreatePatientResponse(
            patient_num=next_num,
            patient_id=patient_id,
            status="created",
        )

    except Exception as e:
        logger.exception("Error creating patient")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création du patient : {str(e)}")
