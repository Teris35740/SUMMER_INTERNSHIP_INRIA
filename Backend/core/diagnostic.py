import re

from core.verification import verify_diagnosis
from core.utils.cache import get_question_count


def parse_diagnosis_attempt(question):
    """Détecte si la question est une tentative de diagnostic (format 'diag : ...').
    
    Retourne le diagnostic de l'étudiant (str) si c'est le cas, sinon None.
    """
    diag_match = re.match(r'^diag\s*:\s*(.+)', question, re.IGNORECASE)
    if diag_match:
        return diag_match.group(1).strip()
    return None


def handle_diagnosis(student_diagnosis, expected_diagnosis, session_id, min_questions):
    """Gère une tentative de diagnostic d'un étudiant.
    
    Vérifie que le nombre minimum de questions a été atteint,
    puis évalue le diagnostic proposé par l'étudiant.
    
    Retourne un dict :
        - Si trop peu de questions posées :
            {"status": "too_early", "q_count": int, "min_questions": int, "remaining": int}
        - Si le diagnostic est évalué :
            {"status": "evaluated", "is_correct": bool, "feedback": str}
    """
    q_count = get_question_count(session_id)
    if q_count < min_questions:
        remaining = min_questions - q_count
        return {
            "status": "too_early",
            "q_count": q_count,
            "min_questions": min_questions,
            "remaining": remaining,
        }

    is_correct, feedback = verify_diagnosis(student_diagnosis, expected_diagnosis)
    return {
        "status": "evaluated",
        "is_correct": is_correct,
        "feedback": feedback,
    }
