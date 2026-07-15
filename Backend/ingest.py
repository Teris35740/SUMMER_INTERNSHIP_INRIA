import os

from core.config import normalize_supabase_url
from core.chunking import build_chunk_records_from_json, build_chunk_records_from_pdf
from core.embedding import embedding_db, store_embeddings_in_supabase


def main():
    supabase_url = normalize_supabase_url(
        os.getenv("SUPABASE_URL", "https://xjvdlkbbiwpafceaguan.supabase.co")
    )
    supabase_key = os.getenv("SUPABASE_KEY")

    if not supabase_key:
        print("Erreur : Clé Supabase introuvable.")
        exit(1)

    # --- INGESTION PATIENT ---
    # json_path = "../Document_patient/patient_03.json"
    # if os.path.exists(json_path):
    #     print(f"Ingestion du dossier patient : {json_path}")
    #     chunk_records_json = build_chunk_records_from_json(json_path)

    #     if chunk_records_json:
    #         chunks = [record["content"] for record in chunk_records_json]
    #         embeddings = embedding_db(chunks)

    #         store_embeddings_in_supabase(
    #             chunk_records_json,
    #             embeddings,
    #             supabase_url,
    #             supabase_key,
    #         )
    #         print("Insertion JSON réussie.")

    # --- INGESTION PDF  ---
    pdf_path = "patella.pdf"
    if os.path.exists(pdf_path):
        print(f"Ingestion du PDF : {pdf_path}")
        chunk_records_pdf = build_chunk_records_from_pdf(pdf_path)
    
        if chunk_records_pdf:
            chunks = [record["content"] for record in chunk_records_pdf]
            embeddings = embedding_db(chunks)
    
            store_embeddings_in_supabase(
                chunk_records_pdf,
                embeddings,
                supabase_url,
                supabase_key,
            )
            print("Insertion PDF réussie.")


if __name__ == "__main__":
    main()
