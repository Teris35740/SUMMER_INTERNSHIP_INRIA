import json
from pathlib import Path
from db.session import SessionLocal
from db.models import Patient


def _patient_json_path(patient_id):
    try:
        patient_number = int(patient_id.split("_")[1])
    except (IndexError, ValueError):
        return None

    base_dir = Path(__file__).resolve().parents[3]
    patient_file = base_dir / "Document_patient" / f"patient_{patient_number:02d}.json"
    return patient_file if patient_file.exists() else None


def load_patient_attitude(patient_id):
    patient_file = _patient_json_path(patient_id)
    if patient_file is None:
        return None

    with patient_file.open("r", encoding="utf-8") as f:
        patient_data = json.load(f)
    return patient_data.get("patient", {}).get("identity", {}).get("patient_attitude")

def load_expected_diagnosis(patient_id):
    patient_file = _patient_json_path(patient_id)
    if patient_file is None:
        return None

    with open(patient_file, "r", encoding="utf-8") as f:
        patient_data = json.load(f)
    expected_diagnosis = patient_data.get("metadata", {}).get("expected_diagnosis", "")
    return expected_diagnosis


def load_patient_data(patient_id):
    try:
        with SessionLocal() as db:
            p = db.query(Patient).filter(Patient.patient_id == patient_id).first()
            if p and p.patient_data:
                return p.patient_data
    except Exception:
        pass

    # Bloc a supprimé car le but est de rester avec juste la db et plus du tout les fichiers json
    try:
        patient_number = int(patient_id.split("_")[1])
    except (IndexError, ValueError):
        return None

    base_dir = Path(__file__).resolve().parents[3]
    for pattern in [f"patient_{patient_number:02d}.json", f"patient_{patient_number}.json", f"patient_{patient_number:03d}.json"]:
        patient_file = base_dir / "Document_patient" / pattern
        if patient_file.exists():
            with patient_file.open("r", encoding="utf-8") as f:
                return json.load(f)

    return None