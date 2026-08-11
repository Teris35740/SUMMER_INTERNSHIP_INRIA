import os
import glob
from collections import defaultdict
from fastapi import APIRouter
from typing import List, Dict
from api.schemas import PatientSummary
from core.utils.helpers import load_patient_data

router = APIRouter()

PATIENT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'Document_patient')

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

