import logging
import os
import glob
from core.config import normalize_supabase_url
from core.rag.chunking import build_chunk_records_from_json, build_chunk_records_from_pdf
from core.rag.embedding import embedding_db, store_embeddings_in_supabase

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)


def main():
    supabase_url = normalize_supabase_url(
        os.getenv("SUPABASE_URL")
    )
    supabase_key = os.getenv("SUPABASE_KEY")

    if not supabase_url or not supabase_key:
        logger.error("Variables d'environnement manquantes (SUPABASE_URL et/ou SUPABASE_KEY).")
        exit(1)

    # --- INGESTION PATIENT ---
    patient_files = glob.glob("../Document_patient/patient_*.json")
    for json_path in sorted(patient_files):
        if os.path.exists(json_path):
            logger.info("Ingestion du dossier patient : %s", json_path)
            chunk_records_json = build_chunk_records_from_json(json_path)

            if chunk_records_json:
                chunks = [record["content"] for record in chunk_records_json]
                embeddings = embedding_db(chunks)

                store_embeddings_in_supabase(
                    chunk_records_json,
                    embeddings,
                    supabase_url,
                    supabase_key,
                )
                logger.info("Insertion JSON réussie pour %s.", os.path.basename(json_path))

    # --- INGESTION PDF  ---
    # pdf_path = "patella.pdf"
    # if os.path.exists(pdf_path):
    #     logger.info("Ingestion du PDF : %s", pdf_path)
    #     chunk_records_pdf = build_chunk_records_from_pdf(pdf_path, method="parent_child")
    
    #     if chunk_records_pdf:
    #         chunks = [record["content"] for record in chunk_records_pdf]
    #         embeddings = embedding_db(chunks)
    
    #         store_embeddings_in_supabase(
    #             chunk_records_pdf,
    #             embeddings,
    #             supabase_url,
    #             supabase_key,
    #         )
    #         logger.info("Insertion PDF réussie.")


if __name__ == "__main__":
    main()
