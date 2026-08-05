import sys
import os
import time
import json
import glob

# Ajout du dossier Backend au sys.path pour pouvoir importer les modules 'core' sans les modifier
backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'Backend')
sys.path.append(backend_path)

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List
import uvicorn

from sentence_transformers import SentenceTransformer, CrossEncoder

# Import depuis le backend
from core.config import EXCERPT_COUNT, MODEL_NAME_QUERY, MODEL_NAME_CROSS_ENCODER, MAX_RETRIES, close_weaviate_client
from core.rag.retrieval import embed_question, fusion_rows
from core.rag.reranking import re_ranking, build_context, expansion_parent_child
from core.llms.llm_gem import answer_with_gemini, analyze_student_question, split_question_analysis, split_answer_struct
from core.utils.cache import add_message, get_history, clear_session, init_session, add_asked_topic, get_clinical_state, add_revealed_fact, increment_question_count, get_question_count, add_useful_question, get_useful_question_count, get_useful_questions
from core.state_motor import state_motor_advanced
from core.verification import verification_answer, fact_id_authorized_by_motor, verify_diagnosis
from core.diagnostic import handle_diagnosis

app = FastAPI(title="RAG Medical API")

@app.on_event("shutdown")
def shutdown_event():
    close_weaviate_client()

# Lazy loading des modèles
model = None
cross_encoder = None

def get_models():
    global model, cross_encoder
    if model is None:
        model = SentenceTransformer(MODEL_NAME_QUERY)
    if cross_encoder is None:
        cross_encoder = CrossEncoder(MODEL_NAME_CROSS_ENCODER)
    return model, cross_encoder

# Path to patient documents
PATIENT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'Document_patient')

def load_patient_file(patient_num: int):
    """Load a patient JSON file by number (e.g., 1 -> patient_01.json)."""
    patient_file = os.path.join(PATIENT_DIR, f"patient_{patient_num:02d}.json")
    if not os.path.exists(patient_file):
        # Try without zero-padding (e.g., patient_100.json)
        patient_file = os.path.join(PATIENT_DIR, f"patient_{patient_num}.json")
    if not os.path.exists(patient_file):
        return None, patient_file
    with open(patient_file, "r", encoding="utf-8") as f:
        return json.load(f), patient_file
    

def get_patient_id_from_num(patient_num: int) -> str:
    """Derive patient_id from number, e.g., 1 -> PAT_001, 100 -> PAT_100."""
    return f"PAT_{patient_num:03d}"


# --- Models ---

class AskRequest(BaseModel):
    question: str
    session_id: str = "session_1"
    patient_num: int = 1

class AskResponse(BaseModel):
    answer: str
    analysis: dict
    clinical_state: dict
    raw_json_response: dict
    history: list
    question_count: int
    # Nouveaux champs pour le debugging et l'UI
    retrieval_info: dict
    reranking_info: list
    state_motor_info: dict
    context_sent_to_llm: str
    verification_info: dict
    timing: dict

class DiagnoseRequest(BaseModel):
    diagnosis: str
    session_id: str = "session_1"
    patient_num: int = 1

class DiagnoseResponse(BaseModel):
    is_correct: bool
    feedback: str
    expected_diagnosis: str
    question_count: int
    report: Optional[dict] = None

class ClearRequest(BaseModel):
    question: str = ""
    session_id: str = "session_1"

class PatientSummary(BaseModel):
    num: int
    patient_id: str
    age: Optional[int] = None
    gender: Optional[str] = None
    difficulty: Optional[str] = None
    specialty: Optional[str] = None
    chief_complaint: Optional[str] = None


# --- Endpoints ---

@app.get("/api/patients", response_model=List[PatientSummary])
def list_patients():
    """List all available patients with summary info."""
    patients = []
    pattern = os.path.join(PATIENT_DIR, "patient_*.json")
    
    for filepath in sorted(glob.glob(pattern)):
        filename = os.path.basename(filepath)
        # Extract patient number from filename (e.g., patient_01.json -> 1)
        try:
            num_str = filename.replace("patient_", "").replace(".json", "")
            num = int(num_str)
        except ValueError:
            continue
        
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            identity = data.get("patient", {}).get("identity", {})
            metadata = data.get("metadata", {})
            chief = data.get("patient", {}).get("chief_complaint", {})
            
            patients.append(PatientSummary(
                num=num,
                patient_id=identity.get("patient_id", get_patient_id_from_num(num)),
                age=identity.get("age"),
                gender=identity.get("gender"),
                difficulty=metadata.get("difficulty"),
                specialty=metadata.get("specialty"),
                chief_complaint=chief.get("information"),
            ))
        except Exception:
            # Skip malformed files
            continue
    
    return patients


@app.post("/api/ask", response_model=AskResponse)
def ask_question(request: AskRequest):
    t_start_total = time.time()
    timing = {}

    question = request.question
    session_id = request.session_id
    patient_num = request.patient_num
    
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    gemini_api_key_question_analysis = os.getenv("GEMINI_API_KEY_QUESTION_ANALYSIS")

    if not all([gemini_api_key, gemini_api_key_question_analysis]):
        raise HTTPException(status_code=500, detail="Variables d'environnement manquantes (GEMINI_API_KEY, GEMINI_API_KEY_QUESTION_ANALYSIS).")

    mod, ce = get_models()
    
    # Load patient data dynamically
    patient_id = get_patient_id_from_num(patient_num)
    patient_data, patient_file = load_patient_file(patient_num)
    
    patient_attitude = None
    if patient_data:
        patient_attitude = patient_data.get("patient", {}).get("identity", {}).get("patient_attitude")

    # Init and get states
    init_session(session_id, patient_attitude=patient_attitude)
    history = get_history(session_id)
    clinical_state = get_clinical_state(session_id)

    # 1. Analyze Question
    t_start_analysis = time.time()
    rep = analyze_student_question(question, gemini_api_key_question_analysis)
    question_type, target_slots, requires_retrieval, search_keywords = split_question_analysis(rep)
    timing["analysis"] = time.time() - t_start_analysis
    
    analysis_dict = {
        "question_type": question_type,
        "target_slots": target_slots,
        "requires_retrieval": requires_retrieval,
        "search_keywords": search_keywords
    }

    # 2. Retrieval
    t_start_retrieval = time.time()
    query_embedding = embed_question(question, mod)
    raw_rows = fusion_rows(query_embedding, search_keywords, filter_patient_id=patient_id)
    timing["retrieval"] = time.time() - t_start_retrieval
    
    retrieval_info = {
        "count": len(raw_rows),
        "top_hybrid_scores": [r.get("hybrid_score") for r in raw_rows[:5]]
    }

    # 3. Reranking
    t_start_rerank = time.time()
    context = ""
    reranking_info = []
    authorized_fact_ids = []
    state_motor_info = {"before_count": 0, "after_count": 0, "global_topics_used": []}

    rows = raw_rows
    if rows:
        state_motor_info["before_count"] = len(rows)
        rows = re_ranking(rows, question, ce)
        
        # Save reranking info for UI
        for r in rows:
            reranking_info.append({
                "source": r.get("source_type"),
                "content_preview": r.get("content", "")[:100] + "...",
                "rerank_score": r.get("rerank_score"),
                "hybrid_score": r.get("hybrid_score")
            })

        rows = expansion_parent_child(rows)
        rows = rows[:EXCERPT_COUNT]

        # 4. State Motor
        t_start_motor = time.time()
        global_topics = clinical_state.get('asked_topics', [])
        state_motor_info["global_topics_used"] = global_topics
        
        rows, blocked_rows = state_motor_advanced(global_topics, target_slots, rows)
        state_motor_info["after_count"] = len(rows)
        
        authorized_fact_ids = fact_id_authorized_by_motor(rows)
        timing["state_motor"] = time.time() - t_start_motor
        
        context = build_context(rows)
    else:
        timing["state_motor"] = 0

    # 5. Generation & Verification
    t_start_gen = time.time()
    tentative = 0
    answer_text = ""
    used_fact_ids = []
    contains_new_claim = False
    raw_answer = ""
    is_valid = False
    verification_msg = ""
    
    while tentative < MAX_RETRIES:
        try:
            raw_answer = answer_with_gemini(question, context, history, clinical_state, gemini_api_key)
            answer_text, used_fact_ids, contains_new_claim = split_answer_struct(raw_answer)
            is_valid, verification_msg = verification_answer(answer_text, used_fact_ids, contains_new_claim, authorized_fact_ids)
            if not is_valid:
                raise Exception(f"Vérification échouée : {verification_msg}")
            break
        except Exception as e:
            tentative += 1
            verification_msg = str(e)
            if tentative >= MAX_RETRIES:
                raise HTTPException(status_code=500, detail=f"Erreur de génération/vérification LLM: {str(e)}")

    timing["generation_and_verification"] = time.time() - t_start_gen
    
    verification_info = {
        "is_valid": is_valid,
        "message": verification_msg,
        "tentatives": tentative + 1 if is_valid else tentative,
        "authorized_fact_ids": authorized_fact_ids,
        "used_fact_ids": used_fact_ids,
        "contains_new_claim": contains_new_claim
    }

    # Tracking de la pertinence (comme dans ask.py)
    if requires_retrieval:
        add_useful_question(session_id, question)

    increment_question_count(session_id)
    add_message(session_id, "user", question)
    add_message(session_id, "assistant", answer_text)
    add_asked_topic(session_id, target_slots)
    add_revealed_fact(session_id, used_fact_ids)

    # Récupérer l'historique et l'état clinique mis à jour
    updated_history = get_history(session_id)
    updated_clinical_state = get_clinical_state(session_id)

    try:
        raw_json_dict = json.loads(raw_answer)
    except:
        raw_json_dict = {"raw": raw_answer}

    timing["total"] = time.time() - t_start_total

    return AskResponse(
        answer=answer_text,
        analysis=analysis_dict,
        clinical_state=updated_clinical_state,
        raw_json_response=raw_json_dict,
        history=updated_history,
        question_count=get_question_count(session_id),
        retrieval_info=retrieval_info,
        reranking_info=reranking_info,
        state_motor_info=state_motor_info,
        context_sent_to_llm=context,
        verification_info=verification_info,
        timing=timing
    )

MIN_QUESTIONS_BEFORE_DIAGNOSIS = 3

@app.post("/api/diagnose", response_model=DiagnoseResponse)
def diagnose(request: DiagnoseRequest):
    """Endpoint pour soumettre un diagnostic avec rapport de notation complet (comme ask.py)."""
    session_id = request.session_id
    student_diagnosis = request.diagnosis.strip()
    patient_num = request.patient_num

    # Charger le diagnostic attendu et les données patient complètes
    patient_data, patient_file = load_patient_file(patient_num)
    if patient_data is None:
        raise HTTPException(status_code=500, detail="Fichier patient introuvable.")
    
    expected_diagnosis = patient_data.get("metadata", {}).get("expected_diagnosis", "")
    if not expected_diagnosis:
        raise HTTPException(status_code=500, detail="Aucun diagnostic attendu dans les métadonnées du patient.")

    # Utiliser handle_diagnosis (exactement comme ask.py)
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
        report=result.get("report")
    )

@app.post("/api/clear")
def clear_session_route(request: ClearRequest):
    from core.utils.cache import clear_session as clear
    clear(request.session_id)
    return {"status": "ok"}

# Serve Frontend files
frontend_dir = os.path.dirname(os.path.abspath(__file__))

@app.get("/")
def read_root():
    return FileResponse(os.path.join(frontend_dir, "index.html"))

app.mount("/", StaticFiles(directory=frontend_dir), name="static")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
