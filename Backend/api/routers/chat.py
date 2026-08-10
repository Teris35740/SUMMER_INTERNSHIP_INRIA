from fastapi import APIRouter, HTTPException, Depends
from api.schemas import AskRequest, AskResponse, DiagnoseRequest, DiagnoseResponse, ClearRequest
from api.services import process_ask_request, get_patient_id_from_num
from api.dependencies import verify_api_keys
from core.utils.helpers import load_patient_data
from core.utils.cache import add_message, get_question_count, clear_session as clear
from core.diagnostic import handle_diagnosis

router = APIRouter()

MIN_QUESTIONS_BEFORE_DIAGNOSIS = 3

@router.post("/ask", response_model=AskResponse)
def ask_question(request: AskRequest, api_keys: tuple = Depends(verify_api_keys)):
    gemini_api_key, gemini_api_key_question_analysis = api_keys
    
    patient_id = get_patient_id_from_num(request.patient_num)
    patient_data = load_patient_data(patient_id)
    
    return process_ask_request(
        request=request,
        patient_data=patient_data,
        gemini_api_key=gemini_api_key,
        gemini_api_key_question_analysis=gemini_api_key_question_analysis
    )

@router.post("/diagnose", response_model=DiagnoseResponse)
def diagnose(request: DiagnoseRequest):
    """Endpoint pour soumettre un diagnostic avec rapport de notation complet"""
    session_id = request.session_id
    student_diagnosis = request.diagnosis.strip()
    patient_num = request.patient_num

    patient_id = get_patient_id_from_num(patient_num)
    patient_data = load_patient_data(patient_id)
    
    if patient_data is None:
        raise HTTPException(status_code=500, detail="Fichier patient introuvable.")
    
    expected_diagnosis = patient_data.get("metadata", {}).get("expected_diagnosis", "")
    if not expected_diagnosis:
        raise HTTPException(status_code=500, detail="Aucun diagnostic attendu dans les métadonnées du patient.")

    result = handle_diagnosis(
        student_diagnosis, expected_diagnosis, session_id, MIN_QUESTIONS_BEFORE_DIAGNOSIS,
        patient_data=patient_data,
    )

    if result["status"] == "too_early":
        raise HTTPException(
            status_code=400,
            detail=f"Vous devez poser au moins {result['min_questions']} questions avant de proposer un diagnostic. "
                   f"Il vous reste {result['remaining']} question(s) à poser."
        )

    # Ajouter le diagnostic dans l'historique
    add_message(session_id, "user", f"[DIAGNOSTIC] {student_diagnosis}")
    add_message(session_id, "assistant", f"[RÉSULTAT] {'✅ Correct' if result['is_correct'] else '❌ Incorrect'} — {result['feedback']}")

    return DiagnoseResponse(
        is_correct=result["is_correct"],
        feedback=result["feedback"],
        expected_diagnosis=expected_diagnosis if not result["is_correct"] else "",
        question_count=get_question_count(session_id),
        report=result.get("report") if not request.is_pedago_mode else None
    )

@router.post("/clear")
def clear_session_route(request: ClearRequest):
    clear(request.session_id)
    return {"status": "ok"}
