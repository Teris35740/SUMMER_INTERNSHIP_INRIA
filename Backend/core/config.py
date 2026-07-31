import os
from functools import lru_cache

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

GEMINI_MODEL = "gemini-flash-lite-latest"

EXCERPT_COUNT = int(os.getenv("EXCERPT_COUNT", "50"))
MAX_RETRIES = int(os.getenv("MAX_RETRIES", "3"))

# --- Noms des tables et RPC Supabase ---
SUPABASE_DOCUMENTS_TABLE = os.getenv("SUPABASE_DOCUMENTS_TABLE", "documents_json")
# SUPABASE_VECTOR_RPC = os.getenv("SUPABASE_VECTOR_RPC", "match_documents_vector_bge")
SUPABASE_VECTOR_RPC = os.getenv("SUPABASE_VECTOR_RPC", "match_vector_documents_json")
# SUPABASE_KEYWORD_RPC = os.getenv("SUPABASE_KEYWORD_RPC", "match_documents_keyword_bge")
SUPABASE_KEYWORD_RPC = os.getenv("SUPABASE_KEYWORD_RPC", "match_text_documents_json")

# --- Facteurs de couche λ pour la récupération stratifiée ---
LAYER_WEIGHTS = {
    "patient": 1.3,
    "reference": 1.0,
}


# --- Chargement lazy des modèles ML (évite le side-effect à l'import) ---
@lru_cache(maxsize=4)
def get_model(model_name=None):
    from sentence_transformers import SentenceTransformer
    if model_name is None:
        model_name = MODEL_NAME
    return SentenceTransformer(model_name)

@lru_cache(maxsize=4)
def get_tokenizer(model_name=None):
    from transformers import AutoTokenizer
    if model_name is None:
        model_name = MODEL_NAME
    return AutoTokenizer.from_pretrained(model_name)


def normalize_supabase_url(raw_url):
    if not raw_url:
        return raw_url
    return raw_url.rstrip("/").removesuffix("/rest/v1")


# --- Scoring de l'étudiant ---
# Poids des indicateurs : w4 > w1 > w2 > w3
SCORING_WEIGHTS = {
    "w1_coverage": 0.30,       # Couverture de l'anamnèse
    "w2_pertinence": 0.15,     # Pertinence des questions
    "w3_structure": 0.10,      # Structure de l'entretien
    "w4_diagnostic": 0.45,     # Performance diagnostique
}

# Ordre clinique idéal (enseigné aux étudiants en médecine)
# 1. Motif de la venue
# 2. Antécédents personnels médicaux et chirurgicaux
# 3. Antécédents familiaux
# 4. Traitements (médicaments)
# 5. Allergies
# 6. Mode de vie (substances, social, voyages, facteurs de risque)
# 7. Histoire de la maladie (évolution, caractéristiques de la douleur)
# 8. Symptômes associés
IDEAL_TOPIC_ORDER = [
    "context_explored",
    "past_medical_history_explored",
    "surgical_history_explored",
    "family_history_explored",
    "medication_asked",
    "allergies_asked",
    "substance_use_explored",
    "social_history_explored",
    "travel_history_explored",
    "risk_factors_explored",
    "history_explored",
    "pain_characteristics_explored",
    "associated_symptoms_explored",
]

# Mapping section du JSON patient -> topic du système
SECTION_TO_TOPIC = {
    "chief_complaint": "context_explored",
    "history": "history_explored",
    "past_medical_history": "past_medical_history_explored",
    "surgical_history": "surgical_history_explored",
    "family_history": "family_history_explored",
    "treatments": "medication_asked",
    "allergies": "allergies_asked",
    "social_history": "social_history_explored",
    "travel_history": "travel_history_explored",
    "risk_factors": "risk_factors_explored",
}
