import sys
import os

from sentence_transformers import SentenceTransformer, CrossEncoder
from supabase import create_client

from core.config import EXCERPT_COUNT, MODEL_NAME_QUERY, MODEL_NAME_CROSS_ENCODER, normalize_supabase_url
from core.retrieval import embed_question, fusion_rows
from core.reranking import re_ranking, build_context
from core.llm import answer_with_gemini


def main():
    supabase_url = normalize_supabase_url(os.getenv("SUPABASE_URL"))
    supabase_key = os.getenv("SUPABASE_KEY")
    gemini_api_key = os.getenv("GEMINI_API_KEY")

    if not all([supabase_url, supabase_key, gemini_api_key]):
        raise SystemExit("Erreur : Variables d'environnement manquantes (SUPABASE_URL, SUPABASE_KEY, GEMINI_API_KEY).")

    question = " ".join(sys.argv[1:]).strip() if len(sys.argv) > 1 else input("Question de l'étudiant : ").strip()

    if not question:
        raise SystemExit("Erreur : Question vide.")

    supabase = create_client(supabase_url, supabase_key)

    print("Chargement du modèle d'embedding...")
    model = SentenceTransformer(MODEL_NAME_QUERY)
    cross_encoder = CrossEncoder(MODEL_NAME_CROSS_ENCODER)

    print("Recherche des documents pertinents...")
    query_embedding = embed_question(question, model)

    rows = fusion_rows(supabase, query_embedding, question)

    if not rows:
        print("Aucun contexte trouvé dans la base de données.")
        return

    rows = re_ranking(rows, question, cross_encoder)

    TOP_K = EXCERPT_COUNT
    rows = rows[:TOP_K]

    context = build_context(rows)
    print("\n--- Contexte fourni au LLM (top {}) ---".format(TOP_K))
    print(context)
    print("------------------------------\n")

    print("Génération de la réponse...")
    answer = answer_with_gemini(question, context, gemini_api_key)

    print("\n--- Réponse finale ---")
    print(answer)


if __name__ == "__main__":
    main()
