import time
import json
from fastapi import HTTPException

from api.schemas import AskRequest, AskResponse
from api.dependencies import get_models

from core.config import EXCERPT_COUNT, MAX_RETRIES
from core.rag.retrieval import embed_question, fusion_rows
from core.rag.reranking import re_ranking, build_context, expansion_parent_child
from core.llms.llm_gem import answer_with_gemini, analyze_student_question, split_question_analysis, split_answer_struct, evaluate_student_question_pedagogy, generate_pedagogical_synthesis
from core.utils.cache import add_message, get_history, clear_session, init_session, add_asked_topic, get_clinical_state, add_revealed_fact, increment_question_count, get_question_count, add_useful_question, get_start_timestamp
from core.state.state_motor import state_motor_datalog
from core.state.verification import verification_answer, fact_id_authorized_by_motor
from core.clinical.vignette import generate_clinical_vignette

from db.session import SessionLocal
from db.models import Patient, PatientImage

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

    t_req_start = time.time()
    # Analyze Question
    t_step = time.time()
    rep = analyze_student_question(question, gemini_api_key_question_analysis)
    print(f"[TIMING] 1. analyze_student_question: {time.time() - t_step:.2f}s")
    question_type, target_slots, requires_retrieval, search_keywords = split_question_analysis(rep)
    
    analysis_dict = {
        "question_type": question_type,
        "target_slots": target_slots,
        "requires_retrieval": requires_retrieval,
        "search_keywords": search_keywords
    }

    # Retrieval
    t_step = time.time()
    query_embedding = embed_question(question, mod)
    raw_rows = fusion_rows(query_embedding, search_keywords, filter_patient_id=patient_id)
    print(f"[TIMING] 2. retrieval (embed+fusion): {time.time() - t_step:.2f}s, rows={len(raw_rows)}")
    
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
        t_step = time.time()
        rows = re_ranking(rows, question, ce)
        print(f"[TIMING] 3. reranking: {time.time() - t_step:.2f}s")
        
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
        
        print("\n" + "=" * 60)
        print("[STATE MOTOR] Entrees")
        print(f"  Topics deja explores : {global_topics}")
        print(f"  Topics de la question : {target_slots}")
        print(f"  Nombre de lignes recues : {len(rows)}")
        for index, row in enumerate(rows, start=1):
            metadata = row.get("metadata", {})
            print(
                f"  [{index}] fact_id={metadata.get('fact_id', '?')} | "
                f"source={row.get('source_type', '?')} | "
                f"policy={metadata.get('reveal_policy', '?')} | "
                f"contenu={row.get('content', '')[:120]!r}"
            )

        t_state_motor_start = time.perf_counter_ns()
        rows, blocked_rows = state_motor_datalog(global_topics, target_slots, rows)
        duration_us = (time.perf_counter_ns() - t_state_motor_start) / 1000.0
        duration_ms = duration_us / 1000.0
        print(f"[TIMING] 3bis. state_motor_datalog: {duration_us:.1f} µs ({duration_ms:.3f} ms)")
        print("[STATE MOTOR] Sortie")
        print(f"  Temps d'execution : {duration_us:.1f} µs ({duration_ms:.3f} ms)")
        print(f"  Lignes autorisees : {len(rows)}")
        print(f"  Lignes bloquees : {len(blocked_rows)}")
        for index, row in enumerate(rows, start=1):
            metadata = row.get("metadata", {})
            print(
                f"  [AUTORISE {index}] fact_id={metadata.get('fact_id', '?')} | "
                f"policy={metadata.get('reveal_policy', '?')}"
            )
            explanation = metadata.get("datalog_explanation")
            if explanation:
                print("      └─ Preuve Datalog (explain_true why-true) :")
                for line in explanation.strip().splitlines():
                    print(f"         {line}")
        for index, blocked in enumerate(blocked_rows, start=1):
            print(
                f"  [BLOQUE {index}] fact_id={blocked.get('fact_id', '?')} | "
                f"policy={blocked.get('reveal_policy', '?')} | "
                f"topic requis={blocked.get('required_topic', '?')}"
            )
            explanation = blocked.get("datalog_explanation")
            if explanation:
                print("      └─ Preuve Datalog (explain_false why-blocked) :")
                for line in explanation.strip().splitlines():
                    print(f"         {line}")
        print("=" * 60 + "\n")

        state_motor_info["after_count"] = len(rows)
        state_motor_info["execution_time_us"] = round(duration_us, 1)
        state_motor_info["execution_time_ms"] = round(duration_ms, 3)
        timing["state_motor_us"] = round(duration_us, 1)
        timing["state_motor_ms"] = round(duration_ms, 3)
        
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
            t_gen_step = time.time()
            raw_answer = answer_with_gemini(question, context, history, clinical_state, gemini_api_key, correction=verification_msg if tentative > 0 else "")
            print(f"[TIMING] 4. answer_with_gemini (tentative {tentative+1}): {time.time() - t_gen_step:.2f}s")
            answer_text, used_fact_ids, contains_new_claim = split_answer_struct(raw_answer)
            is_valid, verification_msg = verification_answer(answer_text, used_fact_ids, contains_new_claim, authorized_fact_ids)
            if not is_valid:
                raise Exception(f"Vérification échouée : {verification_msg}")
            break
        except Exception as e:
            tentative += 1
            verification_msg = str(e)
            print(f"[TIMING] Verification failed (tentative {tentative}): {verification_msg}")
            if tentative >= MAX_RETRIES:
                raise HTTPException(status_code=500, detail=f"Erreur de génération/vérification LLM: {str(e)}")
    
    print(f"[TIMING] Total ask pipeline time: {time.time() - t_req_start:.2f}s")
    
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

    # Générer la vignette clinique humanisée
    clinical_vignette = ""
    if patient_data:
        clinical_vignette = generate_clinical_vignette(patient_data, updated_clinical_state)

    # Récupérer le timestamp de début de session
    start_timestamp = get_start_timestamp(session_id)

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

    # Récupérer les images associées aux faits dévoilés
    revealed_images = []
    if patient_data and used_fact_ids:
        patient_root = patient_data.get("patient", patient_data)
        sections = [
            "chief_complaint", "history", "risk_factors", "travel_history",
            "family_history", "vitals", "past_medical_history", "treatments",
            "allergies", "social_history", "surgical_history"
        ]
        used_facts_set = set(used_fact_ids)
        for sec in sections:
            items = patient_root.get(sec)
            if isinstance(items, dict):
                items = [items]
            if isinstance(items, list):
                for item in items:
                    if isinstance(item, dict) and item.get("fact_id") in used_facts_set:
                        img = item.get("image")
                        if img and isinstance(img, dict):
                            revealed_images.append({
                                "id": str(img.get("id")),
                                "patient_id": patient_id,
                                "fact_id": item.get("fact_id"),
                                "image_type": img.get("image_type", "Examen"),
                                "file_name": img.get("file_name", "image"),
                                "mime_type": img.get("mime_type"),
                                "description": img.get("description"),
                                "url": img.get("url") or f"/api/patients/{patient_id}/images/{img.get('id')}",
                            })

    # Compléter depuis la table patient_images si la DB est accessible
    if used_fact_ids:
        try:
            with SessionLocal() as db:
                db_patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
                if db_patient:
                    db_images = (
                        db.query(PatientImage)
                        .filter(
                            PatientImage.patient_id == db_patient.id,
                            PatientImage.fact_id.in_(used_fact_ids)
                        )
                        .all()
                    )
                    existing_ids = {img["id"] for img in revealed_images}
                    for db_img in db_images:
                        if str(db_img.id) not in existing_ids:
                            revealed_images.append({
                                "id": str(db_img.id),
                                "patient_id": patient_id,
                                "fact_id": db_img.fact_id,
                                "image_type": db_img.image_type,
                                "file_name": db_img.file_name,
                                "mime_type": db_img.mime_type,
                                "description": db_img.description,
                                "url": f"/api/patients/{patient_id}/images/{db_img.id}",
                            })
        except Exception as e:
            print(f"Erreur extraction images DB: {e}")

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
        pedagogical_synthesis=pedagogical_synthesis,
        start_timestamp=start_timestamp,
        clinical_vignette=clinical_vignette,
        images=revealed_images,
    )
