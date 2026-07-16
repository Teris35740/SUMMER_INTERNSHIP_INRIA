import os

from sentence_transformers import SentenceTransformer
from transformers import AutoTokenizer

try:
    from dotenv import load_dotenv
except ImportError:
    def load_dotenv(*args, **kwargs):
        return False

load_dotenv()

# --- Modèles d'embedding ---
# MODEL_NAME = "FremyCompany/BioLORD-2023-M"
MODEL_NAME = "BAAI/bge-base-en-v1.5"
# MODEL_NAME = "ncbi/MedCPT-Article-Encoder"

# --- Modèles pour le pipeline de question ---
# MODEL_NAME_QUERY = "ncbi/MedCPT-Article-Encoder"
# MODEL_NAME_QUERY = "ncbi/MedCPT-Query-Encoder"
MODEL_NAME_QUERY = "BAAI/bge-base-en-v1.5"
# MODEL_NAME_QUERY = "FremyCompany/BioLORD-2023-M"

# --- Modèles pour le encoder ---
MODEL_NAME_CROSS_ENCODER = "ncbi/MedCPT-Cross-Encoder"
# MODEL_NAME_CROSS_ENCODER = "NeuML/biomedbert-base-reranker"
GEMINI_MODEL = "gemini-2.5-flash"


EXCERPT_COUNT = int(os.getenv("EXCERPT_COUNT", "50"))

# --- Noms des tables et RPC Supabase ---
SUPABASE_DOCUMENTS_TABLE = os.getenv("SUPABASE_DOCUMENTS_TABLE", "documents_rag_bge")
SUPABASE_VECTOR_RPC = os.getenv("SUPABASE_VECTOR_RPC", "match_documents_vector_bge")
SUPABASE_KEYWORD_RPC = os.getenv("SUPABASE_KEYWORD_RPC", "match_documents_keyword_bge")

# VIEUC_SUPABASE_DOCUMENTS_TABLE = os.getenv("VIEUC_SUPABASE_DOCUMENTS_TABLE", "documents_rag")
# VIEUC_SUPABASE_VECTOR_RPC = os.getenv("VIEUC_SUPABASE_VECTOR_RPC", "match_documents_vector")
# VIEUC_SUPABASE_KEYWORD_RPC = os.getenv("VIEUC_SUPABASE_KEYWORD_RPC", "match_documents_keyword")

# --- Facteurs de couche λ pour la récupération stratifiée ---
LAYER_WEIGHTS = {
    "patient": 1.3,
    "reference": 1.0,
}

# --- Chargement unique du modèle et du tokenizer ---
_model = SentenceTransformer(MODEL_NAME)
_tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)


def normalize_supabase_url(raw_url):
    if not raw_url:
        return raw_url
    return raw_url.rstrip("/").removesuffix("/rest/v1")
