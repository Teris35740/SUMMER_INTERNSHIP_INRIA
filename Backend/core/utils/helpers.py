import json
from pathlib import Path


def load_patient_attitude(patient_id):
    try:
        patient_number = int(patient_id.split("_")[1])
    except (IndexError, ValueError):
        return None

    base_dir = Path(__file__).resolve().parents[3]

    possible_files = [
        base_dir / "Document_patient" / f"patient_{patient_number:02d}.json",
    ]

    for patient_file in possible_files:
        if patient_file.exists():
            with patient_file.open("r", encoding="utf-8") as f:
                patient_data = json.load(f)
            return patient_data.get("patient", {}).get("identity", {}).get("patient_attitude")

    return None

def load_expected_diagnosis(patient_id):
    base_dir = Path(__file__).resolve().parent.parent
    patient_number = int(patient_id.split("_")[1])
    patient_file = base_dir / "Document_patient" / f"patient_{patient_number:02d}.json"
    with open(patient_file, "r", encoding="utf-8") as f:
        patient_data = json.load(f)
    expected_diagnosis = patient_data.get("metadata", {}).get("expected_diagnosis", "")
    return expected_diagnosis