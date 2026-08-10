import os
from fastapi import HTTPException
from sentence_transformers import SentenceTransformer, CrossEncoder
from core.config import MODEL_NAME_QUERY, MODEL_NAME_CROSS_ENCODER

model = None
cross_encoder = None

def get_models():
    global model, cross_encoder
    if model is None:
        model = SentenceTransformer(MODEL_NAME_QUERY)
    if cross_encoder is None:
        cross_encoder = CrossEncoder(MODEL_NAME_CROSS_ENCODER)
    return model, cross_encoder

def verify_api_keys():
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    gemini_api_key_question_analysis = os.getenv("GEMINI_API_KEY_QUESTION_ANALYSIS")

    if not all([gemini_api_key, gemini_api_key_question_analysis]):
        raise HTTPException(
            status_code=500, 
            detail="Variables d'environnement manquantes (GEMINI_API_KEY, GEMINI_API_KEY_QUESTION_ANALYSIS)."
        )
    return gemini_api_key, gemini_api_key_question_analysis
