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

# --- Weaviate ---
WEAVIATE_URL = os.getenv("WEAVIATE_URL", "http://localhost:8080")
WEAVIATE_API_KEY = os.getenv("WEAVIATE_API_KEY", "")
WEAVIATE_COLLECTION = os.getenv("WEAVIATE_COLLECTION", "MedicalDocuments")
WEAVIATE_EMBEDDING_DIM = 768

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


_weaviate_client = None

def get_weaviate_client():
    global _weaviate_client
    if _weaviate_client is None:
        import weaviate
        if WEAVIATE_API_KEY:
            _weaviate_client = weaviate.connect_to_weaviate_cloud(
                cluster_url=WEAVIATE_URL,
                auth_credentials=weaviate.auth.AuthApiKey(WEAVIATE_API_KEY),
            )
        else:
            _weaviate_client = weaviate.connect_to_local(
                host=WEAVIATE_URL.replace("http://", "").replace("https://", "").split(":")[0],
                port=int(WEAVIATE_URL.split(":")[-1]) if ":" in WEAVIATE_URL.split("//")[-1] else 8080,
            )
    return _weaviate_client


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
    "vitals_measured",
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
    "vitals": "vitals_measured",
}
