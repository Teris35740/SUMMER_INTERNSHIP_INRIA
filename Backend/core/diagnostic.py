import re

from core.verification import verify_diagnosis
from core.scoring import generate_report, format_report
from core.utils.cache import (
    get_question_count,
    get_useful_question_count,
    get_useful_questions,
    get_clinical_state,
    get_elapsed_seconds,
)


def parse_diagnosis_attempt(question):
    """Détecte si la question est une tentative de diagnostic (format 'diag : ...').
    
    Retourne le diagnostic de l'étudiant (str) si c'est le cas, sinon None.
    """
    diag_match = re.match(r'^diag\s*:\s*(.+)', question, re.IGNORECASE)
    if diag_match:
        return diag_match.group(1).strip()
    return None


def handle_diagnosis(student_diagnosis, expected_diagnosis, session_id, patient_data=None):
    """Gère une tentative de diagnostic d'un étudiant.
    
    Évalue le diagnostic proposé par l'étudiant.
    Le scoring est basé sur le temps écoulé (chrono 10 min) au lieu du nombre de questions.
    Si patient_data est fourni, calcule aussi le rapport de notation.
    
    Retourne un dict :
        {\"status\": \"evaluated\", \"is_correct\": bool, \"feedback\": str, \"report\": dict|None,
         \"elapsed_seconds\": float}
    """
    is_correct, feedback = verify_diagnosis(student_diagnosis, expected_diagnosis)

    elapsed_seconds = get_elapsed_seconds(session_id)
    q_count = get_question_count(session_id)

    # Calcul du rapport de notation si les données patient sont disponibles
    report = None
    if patient_data is not None:
        clinical_state = get_clinical_state(session_id)
        asked_topics_history = clinical_state.get("asked_topics", [])
        useful_count = get_useful_question_count(session_id)
        useful_questions_list = get_useful_questions(session_id)

        report = generate_report(
            asked_topics_history=asked_topics_history,
            patient_data=patient_data,
            useful_count=useful_count,
            useful_questions_list=useful_questions_list,
            total_count=q_count,
            is_correct=is_correct,
            elapsed_seconds=elapsed_seconds,
        )

    return {
        "status": "evaluated",
        "is_correct": is_correct,
        "feedback": feedback,
        "report": report,
        "elapsed_seconds": elapsed_seconds,
    }

