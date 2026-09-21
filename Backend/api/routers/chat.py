from fastapi import APIRouter, HTTPException, Depends
from api.schemas import AskRequest, AskResponse, DiagnoseRequest, DiagnoseResponse, ClearRequest, PrescribeRequest, PrescribeResponse
from api.services import process_ask_request, get_patient_id_from_num
from api.dependencies import verify_api_keys
from core.utils.helpers import load_patient_data
from core.utils.cache import add_message, get_question_count, get_elapsed_seconds, clear_session as clear, store_diagnosis_result
from core.config import SESSION_TIME_LIMIT
from core.evaluation.diagnostic import handle_diagnosis
from core.evaluation.prescription import handle_prescription

router = APIRouter()

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
    """Endpoint pour soumettre un diagnostic.
    
    Ne retourne PAS le rapport de notation (celui-ci sera calculé après la prescription).
    Stocke le résultat du diagnostic en cache pour /prescribe.
    """
    session_id = request.session_id
    student_diagnosis = request.diagnosis.strip()
    differential_diagnoses = []
    for diagnosis in request.differential_diagnoses:
        diagnosis = diagnosis.strip()
        if diagnosis:
            differential_diagnoses.append(diagnosis)

        if len(differential_diagnoses) == 3:
            break
    patient_num = request.patient_num

    patient_id = get_patient_id_from_num(patient_num)
    patient_data = load_patient_data(patient_id)
    
    if patient_data is None:
        raise HTTPException(status_code=500, detail="Fichier patient introuvable.")
    
    expected_diagnosis = patient_data.get("metadata", {}).get("expected_diagnosis", "")
    if not expected_diagnosis:
        raise HTTPException(status_code=500, detail="Aucun diagnostic attendu dans les métadonnées du patient.")

    result = handle_diagnosis(
        student_diagnosis, expected_diagnosis, session_id,
        patient_data=None,
        differential_diagnoses=differential_diagnoses,
        is_pedago_mode=request.is_pedago_mode,
    )

    elapsed_seconds = result.get("elapsed_seconds", 0.0)
    time_expired = elapsed_seconds > SESSION_TIME_LIMIT

    # Stocker le résultat du diagnostic dans le cache pour /prescribe
    store_diagnosis_result(session_id, {
        "is_correct": result["is_correct"],
        "elapsed_seconds": elapsed_seconds,
        "differential_diagnoses": differential_diagnoses,
    })

    # Ajouter le diagnostic dans l'historique
    add_message(session_id, "user", f"[DIAGNOSTIC] {student_diagnosis}")
    if differential_diagnoses:
        add_message(session_id, "user", f"[DIFF. DIAGS] {', '.join(differential_diagnoses)}")
    status_label = "✅ Correct" if result["is_correct"] else "❌ Incorrect"
    add_message(session_id, "assistant", f"[RÉSULTAT] {status_label} — {result['feedback']}")

    return DiagnoseResponse(
        is_correct=result["is_correct"],
        feedback=result["feedback"],
        expected_diagnosis=expected_diagnosis if not result["is_correct"] else "",
        report=None,  # Le rapport sera dans /prescribe
        elapsed_seconds=round(elapsed_seconds, 1),
        time_expired=time_expired,
    )


@router.post("/prescribe", response_model=PrescribeResponse)
def prescribe(request: PrescribeRequest):
    """Endpoint pour soumettre une prescription thérapeutique.
    
    Évalue la prescription de l'étudiant via LLM, puis calcule le rapport
    de notation complet (5 indicateurs) incluant la qualité de la prescription.
    """
    session_id = request.session_id
    patient_num = request.patient_num

    patient_id = get_patient_id_from_num(patient_num)
    patient_data = load_patient_data(patient_id)
    
    if patient_data is None:
        raise HTTPException(status_code=500, detail="Fichier patient introuvable.")
    
    # Construire la prescription de l'étudiant sous forme de dict
    student_prescription = {
        "molecules": [
            {
                "name": mol.name,
                "dosage": mol.dosage,
                "route": mol.route,
                "duration": mol.duration,
            }
            for mol in request.molecules
        ]
    }
    
    result = handle_prescription(
        student_prescription=student_prescription,
        session_id=session_id,
        patient_data=patient_data,
    )
    
    if result["status"] == "error":
        raise HTTPException(status_code=400, detail=result.get("error", "Erreur lors de l'évaluation de la prescription."))
    
    # Ajouter la prescription dans l'historique
    mol_names = ", ".join(mol.name for mol in request.molecules)
    add_message(session_id, "user", f"[PRESCRIPTION] {mol_names}")
    add_message(session_id, "assistant", f"[ÉVALUATION] Score prescription : {result.get('prescription_evaluation', {}).get('overall_score', 0):.2f}")

    return PrescribeResponse(
        status=result["status"],
        prescription_evaluation=result.get("prescription_evaluation"),
        report=result.get("report"),
    )


@router.post("/clear")
def clear_session_route(request: ClearRequest):
    clear(request.session_id)
    return {"status": "ok"}

