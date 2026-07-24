import os
import json

def load_patient_attitude(patient_id):
    patient_file = os.path.join(os.path.dirname(__file__), "..", "Document_patient", f"patient_{patient_id.split('_')[1]}.json")
    patient_attitude = None
    if os.path.exists(patient_file):
        with open(patient_file, "r", encoding="utf-8") as f:
            patient_data = json.load(f)
        patient_attitude = patient_data.get("patient", {}).get("identity", {}).get("patient_attitude")
    return patient_attitude