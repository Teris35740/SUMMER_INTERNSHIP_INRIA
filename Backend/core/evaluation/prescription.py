import os

from core.llms.llm_gem import evaluate_prescription_with_gemini
from core.evaluation.scoring import generate_report
from core.utils.cache import (
    get_question_count,
    get_useful_question_count,
    get_useful_questions,
    get_clinical_state,
    get_diagnosis_result,
)


def handle_prescription(student_prescription, session_id, patient_data):
    """Gère la soumission d'une prescription par l'étudiant.
    
    1. Récupère le expected_treatment depuis les métadonnées patient
    2. Appelle le LLM pour évaluer la prescription
    3. Récupère le résultat du diagnostic (stocké en cache)
    4. Calcule le rapport de notation complet (5 indicateurs)
    
    Retourne un dict :
        {"status": "evaluated", "prescription_evaluation": dict, "report": dict}
    """
    expected_treatment = patient_data.get("metadata", {}).get("expected_treatment")
    if not expected_treatment:
        return {
            "status": "error",
            "error": "Aucun traitement attendu défini pour ce patient.",
            "prescription_evaluation": None,
            "report": None,
        }
    
    api_key = os.getenv("GEMINI_API_KEY")
    prescription_eval = evaluate_prescription_with_gemini(
        student_prescription=student_prescription,
        expected_treatment=expected_treatment,
        patient_data=patient_data,
        api_key=api_key,
    )
    
    diagnosis_result = get_diagnosis_result(session_id)
    if diagnosis_result is None:
        return {
            "status": "error",
            "error": "Aucun diagnostic soumis pour cette session. Le diagnostic doit précéder la prescription.",
            "prescription_evaluation": prescription_eval,
            "report": None,
        }
    
    is_correct = diagnosis_result.get("is_correct", False)
    elapsed_seconds = diagnosis_result.get("elapsed_seconds", 0.0)
    differential_diagnoses = diagnosis_result.get("differential_diagnoses", [])
    
    clinical_state = get_clinical_state(session_id)
    asked_topics_history = clinical_state.get("asked_topics", [])
    useful_count = get_useful_question_count(session_id)
    useful_questions_list = get_useful_questions(session_id)
    q_count = get_question_count(session_id)
    
    prescription_score = prescription_eval.get("overall_score", 0.0)
    
    prescription_details = {
        "molecule_score": prescription_eval.get("molecule_score", 0.0),
        "dosage_score": prescription_eval.get("dosage_score", 0.0),
        "route_score": prescription_eval.get("route_score", 0.0),
        "duration_score": prescription_eval.get("duration_score", 0.0),
        "contraindications_respected": prescription_eval.get("contraindications_respected", True),
        "overall_score": prescription_score,
        "feedback": prescription_eval.get("feedback", ""),
        "expected_molecules": prescription_eval.get("expected_molecules", []),
        "prescribed_molecules": prescription_eval.get("prescribed_molecules", []),
        "missed_molecules": prescription_eval.get("missed_molecules", []),
        "contraindication_details": prescription_eval.get("contraindication_details", ""),
        "expected_treatment": expected_treatment,
    }
    
    report = generate_report(
        asked_topics_history=asked_topics_history,
        patient_data=patient_data,
        useful_count=useful_count,
        useful_questions_list=useful_questions_list,
        total_count=q_count,
        is_correct=is_correct,
        elapsed_seconds=elapsed_seconds,
        prescription_score=prescription_score,
        prescription_details=prescription_details,
        differential_diagnoses=differential_diagnoses,
    )
    
    return {
        "status": "evaluated",
        "prescription_evaluation": prescription_details,
        "report": report,
    }
