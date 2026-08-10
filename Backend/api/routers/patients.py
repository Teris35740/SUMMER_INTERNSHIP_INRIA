import os
import glob
from fastapi import APIRouter
from typing import List
from api.schemas import PatientSummary
from core.utils.helpers import load_patient_data

router = APIRouter()

PATIENT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'Document_patient')

def get_patient_id_from_num(patient_num: int) -> str:
    return f"PAT_{patient_num:03d}"

@router.get("/patients", response_model=List[PatientSummary])
def list_patients():
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
