import os
import glob
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
    # patient_files = glob.glob("../Document_patient/patient_*.json")
    # for json_path in sorted(patient_files):
    #     if os.path.exists(json_path):
    #         print(f"Ingestion du dossier patient : {json_path}")
    #         chunk_records_json = build_chunk_records_from_json(json_path)

    #         if chunk_records_json:
    #             chunks = [record["content"] for record in chunk_records_json]
    #             embeddings = embedding_db(chunks)

    #             store_embeddings_in_supabase(
    #                 chunk_records_json,
    #                 embeddings,
    #                 supabase_url,
    #                 supabase_key,
    #             )
    #             print(f"Insertion JSON réussie pour {os.path.basename(json_path)}.")

    # --- INGESTION PDF  ---
    pdf_path = "patella.pdf"
    if os.path.exists(pdf_path):
        print(f"Ingestion du PDF : {pdf_path}")
        chunk_records_pdf = build_chunk_records_from_pdf(pdf_path, method="parent_child")
    
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
