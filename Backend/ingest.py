import logging
import os
import glob
from core.rag.chunking import build_chunk_records_from_json, build_chunk_records_from_pdf
from core.rag.embedding import embedding_db, store_in_weaviate

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)


def main():
    # --- INGESTION PATIENT ---
    patient_files = glob.glob("../Document_patient/patient_*.json")
    for json_path in sorted(patient_files):
        if os.path.exists(json_path):
            logger.info("Ingestion du dossier patient : %s", json_path)
            chunk_records_json = build_chunk_records_from_json(json_path)

            if chunk_records_json:
                chunks = [record["content"] for record in chunk_records_json]
                embeddings = embedding_db(chunks)

                store_in_weaviate(
                    chunk_records_json,
                    embeddings,
                )
                logger.info("Insertion Weaviate réussie pour %s.", os.path.basename(json_path))

    # --- INGESTION PDF  ---
    # pdf_path = "patella.pdf"
    # if os.path.exists(pdf_path):
    #     logger.info("Ingestion du PDF : %s", pdf_path)
    #     chunk_records_pdf = build_chunk_records_from_pdf(pdf_path, method="parent_child")
    
    #     if chunk_records_pdf:
    #         chunks = [record["content"] for record in chunk_records_pdf]
    #         embeddings = embedding_db(chunks)
    
    #         store_in_weaviate(
    #             chunk_records_pdf,
    #             embeddings,
    #         )
    #         logger.info("Insertion PDF Weaviate réussie.")
    
    from core.config import close_weaviate_client
    close_weaviate_client()


if __name__ == "__main__":
    main()
