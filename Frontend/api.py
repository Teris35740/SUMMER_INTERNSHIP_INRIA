import sys
import os

# Ajout du dossier Backend au sys.path pour pouvoir importer les modules 'core' sans les modifier
backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'Backend')
sys.path.append(backend_path)

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import uvicorn

from sentence_transformers import SentenceTransformer, CrossEncoder
from supabase import create_client

# Import depuis le backend
from core.config import EXCERPT_COUNT, MODEL_NAME_QUERY, MODEL_NAME_CROSS_ENCODER, MAX_RETRIES, normalize_supabase_url
from core.retrieval import embed_question, fusion_rows
from core.reranking import re_ranking, build_context, expansion_parent_child
from core.llm_gem import answer_with_gemini, analyze_student_question, split_question_analysis, split_answer_struct
from core.cache import add_message, get_history, clear_session, init_session, add_asked_topic, get_clinical_state, add_revealed_fact

app = FastAPI(title="RAG Medical API")

# Lazy loading des modèles pour ne pas bloquer le démarrage immédiatement
model = None
cross_encoder = None

def get_models():
    global model, cross_encoder
    if model is None:
        model = SentenceTransformer(MODEL_NAME_QUERY)
    if cross_encoder is None:
        cross_encoder = CrossEncoder(MODEL_NAME_CROSS_ENCODER)
    return model, cross_encoder

class AskRequest(BaseModel):
    question: str
    session_id: str = "session_1"

class AskResponse(BaseModel):
    answer: str
    analysis: dict
    clinical_state: dict
    raw_json_response: dict
    history: list

@app.post("/api/ask", response_model=AskResponse)
def ask_question(request: AskRequest):
    question = request.question
    session_id = request.session_id
    
    supabase_url = normalize_supabase_url(os.getenv("SUPABASE_URL"))
    supabase_key = os.getenv("SUPABASE_KEY")
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    gemini_api_key_question_analysis = os.getenv("GEMINI_API_KEY_QUESTION_ANALYSIS")

    if not all([supabase_url, supabase_key, gemini_api_key, gemini_api_key_question_analysis]):
        raise HTTPException(status_code=500, detail="Variables d'environnement manquantes.")

    supabase = create_client(supabase_url, supabase_key)
    mod, ce = get_models()
    
    # Init and get states
    init_session(session_id)
    history = get_history(session_id)
    clinical_state = get_clinical_state(session_id)

    # Analyze
    rep = analyze_student_question(question, gemini_api_key_question_analysis)
    question_type, target_slots, requires_retrieval = split_question_analysis(rep)
    
    analysis_dict = {
        "question_type": question_type,
        "target_slots": target_slots,
        "requires_retrieval": requires_retrieval
    }

    # Retrieve & Rerank
    query_embedding = embed_question(question, mod)
    rows = fusion_rows(supabase, query_embedding, question)
    
    context = ""
    if rows:
        rows = re_ranking(rows, question, ce)
        rows = expansion_parent_child(rows)
        rows = rows[:EXCERPT_COUNT]
        context = build_context(rows)

    # Generate
    tentative = 0
    answer_text = ""
    used_fact_ids = []
    contains_new_claim = False
    raw_answer = ""
    
    while tentative < MAX_RETRIES:
        try:
            raw_answer = answer_with_gemini(question, context, history, clinical_state, gemini_api_key)
            answer_text, used_fact_ids, contains_new_claim = split_answer_struct(raw_answer)
            break
        except Exception as e:
            tentative += 1
            if tentative >= MAX_RETRIES:
                raise HTTPException(status_code=500, detail=f"Erreur de génération LLM: {str(e)}")

    add_message(session_id, "user", question)
    add_message(session_id, "assistant", answer_text)
    add_asked_topic(session_id, target_slots)
    add_revealed_fact(session_id, used_fact_ids)

    # Récupérer l'historique et l'état clinique mis à jour
    updated_history = get_history(session_id)
    updated_clinical_state = get_clinical_state(session_id)

    try:
        import json
        raw_json_dict = json.loads(raw_answer)
    except:
        raw_json_dict = {"raw": raw_answer}

    return AskResponse(
        answer=answer_text,
        analysis=analysis_dict,
        clinical_state=updated_clinical_state,
        raw_json_response=raw_json_dict,
        history=updated_history
    )

@app.post("/api/clear")
def clear_session_route(request: AskRequest):
    from core.cache import clear_session as clear
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
