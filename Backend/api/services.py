import time
import json
from fastapi import HTTPException

from api.schemas import AskRequest, AskResponse
from api.dependencies import get_models

from core.config import EXCERPT_COUNT, MAX_RETRIES
from core.rag.retrieval import embed_question, fusion_rows
from core.rag.reranking import re_ranking, build_context, expansion_parent_child
from core.llms.llm_gem import answer_with_gemini, analyze_student_question, split_question_analysis, split_answer_struct, evaluate_student_question_pedagogy, generate_pedagogical_synthesis
from core.utils.cache import add_message, get_history, clear_session, init_session, add_asked_topic, get_clinical_state, add_revealed_fact, increment_question_count, get_question_count, add_useful_question
from core.state_motor import state_motor_advanced
from core.verification import verification_answer, fact_id_authorized_by_motor

def get_patient_id_from_num(patient_num: int) -> str:
    """Derive patient_id from number, e.g., 1 -> PAT_001, 100 -> PAT_100."""
    return f"PAT_{patient_num:03d}"

def process_ask_request(request: AskRequest, patient_data: dict, gemini_api_key: str, gemini_api_key_question_analysis: str) -> AskResponse:
    timing = {}

    question = request.question
    session_id = request.session_id
    patient_num = request.patient_num

    mod, ce = get_models()
    
    patient_id = get_patient_id_from_num(patient_num)
    
    patient_attitude = None
    if patient_data:
        patient_attitude = patient_data.get("patient", {}).get("identity", {}).get("patient_attitude")

    # Init 
    init_session(session_id, patient_attitude=patient_attitude)
    history = get_history(session_id)
    clinical_state = get_clinical_state(session_id)

    # Analyze Question
    rep = analyze_student_question(question, gemini_api_key_question_analysis)
    question_type, target_slots, requires_retrieval, search_keywords = split_question_analysis(rep)
    
    analysis_dict = {
        "question_type": question_type,
        "target_slots": target_slots,
        "requires_retrieval": requires_retrieval,
        "search_keywords": search_keywords
    }

    # Retrieval
    query_embedding = embed_question(question, mod)
    raw_rows = fusion_rows(query_embedding, search_keywords, filter_patient_id=patient_id)
    
    retrieval_info = {
        "count": len(raw_rows),
        "top_hybrid_scores": [r.get("hybrid_score") for r in raw_rows[:5]]
    }

    # Reranking
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

        # State Motor
        global_topics = clinical_state.get('asked_topics', [])
        state_motor_info["global_topics_used"] = global_topics
        
        rows, blocked_rows = state_motor_advanced(global_topics, target_slots, rows)
        state_motor_info["after_count"] = len(rows)
        
        authorized_fact_ids = fact_id_authorized_by_motor(rows)
        
        context = build_context(rows)

    # Generation & Verification
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
    
    verification_info = {
        "is_valid": is_valid,
        "message": verification_msg,
        "tentatives": tentative + 1 if is_valid else tentative,
        "authorized_fact_ids": authorized_fact_ids,
        "used_fact_ids": used_fact_ids,
        "contains_new_claim": contains_new_claim
    }

    # Tracking de la pertinence
    if requires_retrieval:
        add_useful_question(session_id, question)

    increment_question_count(session_id)
    add_message(session_id, "user", question)
    add_message(session_id, "assistant", answer_text)
    add_asked_topic(session_id, target_slots)
    add_revealed_fact(session_id, used_fact_ids)

    updated_history = get_history(session_id)
    updated_clinical_state = get_clinical_state(session_id)

    try:
        raw_json_dict = json.loads(raw_answer)
    except:
        raw_json_dict = {"raw": raw_answer}

    pedagogical_evaluation = None
    pedagogical_synthesis = None

    if request.is_pedago_mode:
        try:
            expected_diagnosis = patient_data.get("metadata", {}).get("expected_diagnosis", "")
            pedagogical_evaluation = evaluate_student_question_pedagogy(question, expected_diagnosis, updated_history, gemini_api_key_question_analysis)
            
            sci_keywords = pedagogical_evaluation.get("scientific_keywords", "")
            if sci_keywords:
                sci_emb = embed_question(sci_keywords, mod)
                sci_rows = fusion_rows(sci_emb, sci_keywords, filter_source_type="reference")
                
                sci_context = ""
                if sci_rows:
                    sci_rows = re_ranking(sci_rows, sci_keywords, ce)
                    sci_rows = expansion_parent_child(sci_rows)
                    sci_rows = sci_rows[:3]
                    sci_context = build_context(sci_rows)
                
                pedagogical_synthesis = generate_pedagogical_synthesis(question, sci_context, gemini_api_key_question_analysis)
        except Exception as e:
            print(f"Erreur lors de l'évaluation pédagogique : {e}")

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
        timing=timing,
        pedagogical_evaluation=pedagogical_evaluation,
        pedagogical_synthesis=pedagogical_synthesis
    )
