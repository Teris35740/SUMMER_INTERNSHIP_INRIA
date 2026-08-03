import os
import sys
import json

from sentence_transformers import CrossEncoder

from core.config import (
    EXCERPT_COUNT,
    MAX_RETRIES,
    MODEL_NAME_CROSS_ENCODER,
    MODEL_NAME_QUERY,
    get_model,
)
from core.llms.llm_gem import (
    analyze_student_question,
    answer_with_gemini,
    split_answer_struct,
    split_question_analysis,
    test_pdf_answer_with_gemini
)
from core.rag.reranking import build_context, expansion_parent_child, re_ranking
from core.rag.retrieval import embed_question, fusion_rows
from core.diagnostic import parse_diagnosis_attempt, handle_diagnosis
from core.state_motor import state_motor_advanced, state_motor_simple
from core.utils.cache import (
    add_asked_topic,
    add_message,
    add_revealed_fact,
    clear_session,
    get_clinical_state,
    get_history,
    increment_question_count,
    add_useful_question,
    get_question_count,
    init_session
)
from core.utils.helpers import load_patient_attitude, load_expected_diagnosis, load_patient_data
from core.scoring import format_report
from core.verification import fact_id_authorized_by_motor, verification_answer


def main():
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    gemini_api_key_question_analysis = os.getenv("GEMINI_API_KEY_QUESTION_ANALYSIS")
    # mistral_api_key = os.getenv("RAGARENN")
    # mistral_base_url = os.getenv("URL_RAGARENN")

    env_vars = [
        gemini_api_key, 
        gemini_api_key_question_analysis
    ]
    
    if not all(env_vars):
        raise SystemExit(
            "Erreur : Variables d'environnement manquantes "
            "(GEMINI_API_KEY, GEMINI_API_KEY_QUESTION_ANALYSIS)."
        )

    # à améliorer pour gérer plusieurs sessions/patients
    patient_id = "PAT_001"
    session_id = "session_1"
    MIN_QUESTIONS = 3

    # Charger le diagnostic attendu et les données complètes du patient
    expected_diagnosis = load_expected_diagnosis(patient_id)
    if expected_diagnosis is None:
        raise SystemExit(f"Erreur : Impossible de charger le diagnostic attendu pour {patient_id}.")

    patient_data = load_patient_data(patient_id)
    if patient_data is None:
        print(f"Attention : Données patient complètes non disponibles pour {patient_id}. Le scoring sera désactivé.")
    
    try:
        print("Chargement des modèles ML d'embedding et de reranking...")
        model = get_model(MODEL_NAME_QUERY)
        cross_encoder = CrossEncoder(MODEL_NAME_CROSS_ENCODER)

        while True:
            if len(sys.argv) > 1:
                question = " ".join(sys.argv[1:]).strip()
                sys.argv = [sys.argv[0]] 
            else:
                question = input("\nQuestion de l'étudiant : ").strip()

            if not question:
                print("Erreur : Question vide. Veuillez formuler une question.")
                continue

            # Détection du diagnostic : si l'étudiant tape "diag : ..."
            student_diagnosis = parse_diagnosis_attempt(question)
            if student_diagnosis is not None:
                result = handle_diagnosis(
                    student_diagnosis, expected_diagnosis, session_id, MIN_QUESTIONS,
                    patient_data=patient_data,
                )

                if result["status"] == "too_early":
                    print(f"\n  Vous devez poser au moins {result['min_questions']} questions avant de diagnostiquer.")
                    print(f"    Questions posées : {result['q_count']}/{result['min_questions']} (encore {result['remaining']})")
                    continue

                print("\n" + "=" * 50)
                if result["is_correct"]:
                    print("DIAGNOSTIC CORRECT !")
                else:
                    print("DIAGNOSTIC INCORRECT")
                print(f"   {result['feedback']}")
                print("=" * 50)

                # Affichage du rapport de notation
                if result.get("report"):
                    print(format_report(result["report"]))

                continue
            
            # Gestion de la session et de l'historique
            patient_attitude = load_patient_attitude(patient_id)
            init_session(session_id, patient_attitude=patient_attitude)
            history = get_history(session_id)
            
            print("\n--- Historique de la session ---")
            for msg in history:
                print(f"  {msg['role']}: {msg['content']}")
                
            clinical_state = get_clinical_state(session_id)
            print("\n--- État clinique actuel ---")
            print(clinical_state)

            # Analyse de la question
            rep = analyze_student_question(question, gemini_api_key_question_analysis)
            question_type, target_slots, requires_retrieval, search_keywords = split_question_analysis(rep)
            
            print("\n--- Analyse de la question ---")
            print(f"Type de question : {question_type}")
            print(f"Thèmes abordés : {', '.join(target_slots)}")
            print(f"Nécessite récupération : {'Oui' if requires_retrieval else 'Non'}")
            print(f"Mots-clés de recherche : {search_keywords}")

            # Tracking de la pertinence (question utile si nécessite une recherche)
            if requires_retrieval:
                add_useful_question(session_id, question)

            # RAG : Recherche et traitement des documents
            print("\nRecherche des documents pertinents...")
            query_embedding = embed_question(question, model)

            # if requires_retrieval: # Si le llm a déterminé que la question nécessite de fouiller le dossier.
            rows = fusion_rows(query_embedding, search_keywords, filter_patient_id=patient_id)

            if not rows:
                print("Aucun contexte trouvé dans la base de données.")
                continue

            # Reranking et filtrage
            top_k = EXCERPT_COUNT
            rows = re_ranking(rows, question, cross_encoder)
            rows = expansion_parent_child(rows)
            rows = rows[:top_k]

            global_topics = clinical_state.get('asked_topics', [])
            # rows = state_motor_simple(target_slots, rows)
            rows, blocked = state_motor_advanced(global_topics, target_slots, rows)

            if blocked:
                print(f"\n--- Faits bloqués par le moteur d'état ({len(blocked)}) ---")
                for b in blocked:
                    print(f"  [BLOQUÉ] {b['fact_id']} | policy: {b['reveal_policy']} | "
                          f"topic requis: {b['required_topic']} | "
                          f"topics explorés: {b['explored_topics']}")

            # Construction du contexte
            context = build_context(rows)
            print(f"\n--- Contexte fourni au LLM (top {top_k}) ---")
            print(context)
            print("-" * 30 + "\n")

            # Génération de la réponse
            print("Génération de la réponse...")
            tentatives = 0
            error = ""
            
            while tentatives < MAX_RETRIES:
                try:
                    answer = answer_with_gemini(
                        question, context, history, clinical_state, gemini_api_key, correction=error
                    )
                    # answer = test_pdf_answer_with_gemini(question, context, gemini_api_key)
                    # answer = answer_with_mistral(question, context, history, clinical_state, mistral_api_key, base_url=mistral_base_url)
                    
                    answer_text, used_fact_ids, contains_new_claim = split_answer_struct(answer)
                    is_valid, msg = verification_answer(
                        answer_text, used_fact_ids, contains_new_claim, fact_id_authorized_by_motor(rows)
                    )
                    
                    if not is_valid:
                        error = msg
                        raise Exception(f"Vérification échouée : {msg}")
                        
                    break # Succès de la génération
                    
                except Exception as e:
                    tentatives += 1
                    print(f"Erreur lors de la génération de la réponse (tentative {tentatives}/{MAX_RETRIES}) : {e}")
                    if tentatives >= MAX_RETRIES:
                        print("Échec après plusieurs tentatives. Veuillez réessayer plus tard.")
                        break

            # Mise à jour de la session si succès
            if tentatives < MAX_RETRIES:
                increment_question_count(session_id)
                add_message(session_id, "user", question)
                add_message(session_id, "assistant", answer_text)
                add_asked_topic(session_id, target_slots)
                add_revealed_fact(session_id, used_fact_ids)

                q_count = get_question_count(session_id)
                print(f"\n--- Réponse finale (question {q_count}/{MIN_QUESTIONS} avant diagnostic) ---")
                print(answer)

    except KeyboardInterrupt:
        print("\nInterruption par l'utilisateur. Fin du programme.")
    except Exception as e:
        print(f"\nErreur critique inattendue : {e}")
    finally:
        clear_session(session_id)
        print("Session terminée et cache nettoyé.")


if __name__ == "__main__":
    main()