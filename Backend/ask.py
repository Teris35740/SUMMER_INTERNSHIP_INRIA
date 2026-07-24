import sys
import os

from sentence_transformers import SentenceTransformer, CrossEncoder
from supabase import create_client

from core.config import EXCERPT_COUNT, MODEL_NAME_QUERY, MODEL_NAME_CROSS_ENCODER, MAX_RETRIES, normalize_supabase_url
from core.rag.retrieval import embed_question, fusion_rows
from core.rag.reranking import re_ranking, build_context, expansion_parent_child
from core.llms.llm_gem import answer_with_gemini, analyze_student_question, split_question_analysis, split_answer_struct, test_pdf_answer_with_gemini
# from core.llm_openai import answer_with_mistral, analyze_student_question, split_question_analysis, split_answer_struct
from core.utils.cache import add_message, get_history, clear_session, init_session, add_asked_topic, get_clinical_state, add_revealed_fact
from core.state_motor import state_motor_simple, state_motor_advanced
from core.verification import verification_answer, fact_id_authorized_by_motor


def main():
    supabase_url = normalize_supabase_url(os.getenv("SUPABASE_URL"))
    supabase_key = os.getenv("SUPABASE_KEY")
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    gemini_api_key_question_analysis = os.getenv("GEMINI_API_KEY_QUESTION_ANALYSIS")
    # mistral_api_key = os.getenv("RAGARENN")
    # mistral_base_url = os.getenv("URL_RAGARENN")

    if not all([supabase_url, supabase_key, gemini_api_key, gemini_api_key_question_analysis,]):
        raise SystemExit("Erreur : Variables d'environnement manquantes (SUPABASE_URL, SUPABASE_KEY, GEMINI_API_KEY, GEMINI_API_KEY_QUESTION_ANALYSIS).")

    try:

        patient_id = "PAT_001"  # Pour l'instant, on utilise un patient fixe. À améliorer pour gérer plusieurs patients.

        # Charger le fichier patient pour récupérer le patient_attitude
        import json
        patient_file = os.path.join(os.path.dirname(__file__), "..", "Document_patient", f"patient_{patient_id.split('_')[1]}.json")
        patient_attitude = None
        if os.path.exists(patient_file):
            with open(patient_file, "r", encoding="utf-8") as f:
                patient_data = json.load(f)
            patient_attitude = patient_data.get("patient", {}).get("identity", {}).get("patient_attitude")

        while True:
            question = " ".join(sys.argv[1:]).strip() if len(sys.argv) > 1 else input("Question de l'étudiant : ").strip()

            if not question:
                raise SystemExit("Erreur : Question vide.")
            
            supabase = create_client(supabase_url, supabase_key)

            session_id = "session_1"  # Pour l'instant, on utilise une session fixe. À améliorer pour gérer plusieurs sessions.
            init_session(session_id, patient_attitude=patient_attitude)
            history = get_history(session_id)
            print("\n--- Historique de la session ---")
            for msg in history:
                print(f"  {msg['role']}: {msg['content']}")
            clinical_state = get_clinical_state(session_id)
            print("\n--- État clinique actuel ---")
            print(clinical_state)

            rep = analyze_student_question(question, gemini_api_key_question_analysis)
            question_type, target_slots, requires_retrieval, search_keywords = split_question_analysis(rep)
            print("\n--- Analyse de la question ---")
            print(f"Type de question : {question_type}")
            print(f"Thèmes abordés : {', '.join(target_slots)}")
            print(f"Nécessite récupération : {'Oui' if requires_retrieval else 'Non'}")
            print(f"Mots-clés de recherche : {search_keywords}")

            print("Chargement du modèle d'embedding...")
            model = SentenceTransformer(MODEL_NAME_QUERY)
            cross_encoder = CrossEncoder(MODEL_NAME_CROSS_ENCODER)

            print("Recherche des documents pertinents...")
            query_embedding = embed_question(question, model)

            rows = fusion_rows(supabase, query_embedding, search_keywords, filter_patient_id=patient_id)

            if not rows:
                print("Aucun contexte trouvé dans la base de données.")
                return

            rows = re_ranking(rows, question, cross_encoder)

            rows = expansion_parent_child(rows)
            TOP_K = EXCERPT_COUNT
            rows = rows[:TOP_K]

            global_topics = clinical_state.get('asked_topics', [])

            # rows = state_motor_simple(target_slots, rows)
            rows = state_motor_advanced(global_topics, target_slots, rows)

            context = build_context(rows)
            print("\n--- Contexte fourni au LLM (top {}) ---".format(TOP_K))
            print(context)
            print("------------------------------\n")

            print("Génération de la réponse...")

            tentatives = 0
            while tentatives < MAX_RETRIES:
                try:
                    answer = answer_with_gemini(question, context, history, clinical_state, gemini_api_key)
                    # answer = test_pdf_answer_with_gemini(question, context, gemini_api_key)
                    # answer = answer_with_mistral(question, context, history, clinical_state, mistral_api_key, base_url=mistral_base_url)
                    answer_text, used_fact_ids, contains_new_claim = split_answer_struct(answer)
                    is_valid, msg = verification_answer(answer_text, used_fact_ids, contains_new_claim, fact_id_authorized_by_motor(rows))
                    if not is_valid:
                        raise Exception(f"Vérification échouée : {msg}")
                    break
                except Exception as e:
                    tentatives += 1
                    print(f"Erreur lors de la génération de la réponse (tentative {tentatives}/{MAX_RETRIES}) : {e}")
                    if tentatives >= MAX_RETRIES:
                        raise SystemExit("Échec après plusieurs tentatives. Veuillez réessayer plus tard.")

            add_message(session_id, "user", question)
            add_message(session_id, "assistant", answer_text)
            add_asked_topic(session_id, target_slots)
            add_revealed_fact(session_id, used_fact_ids)

            print("\n--- Réponse finale ---")
            print(answer)
    except KeyboardInterrupt:
        print("\nInterruption par l'utilisateur. Fin du programme.")

    finally:
        clear_session(session_id)
        print("Session terminée et cache nettoyé.")


if __name__ == "__main__":
    main()
