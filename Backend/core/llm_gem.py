from google import genai
from pydantic import BaseModel
from typing import List
import json

from .config import GEMINI_MODEL

class QuestionAnalysis(BaseModel):
    question_type: str
    target_slots: List[str]
    requires_retrieval: bool

class AnswerStruct(BaseModel):
    answer_text: str
    used_fact_ids: List[str]
    contains_new_claim: bool


SYSTEM_PROMPT = """Tu es un patient virtuel participant à un jeu de rôle clinique pour entraîner des étudiants en médecine au diagnostic.

RÈGLES STRICTES DE COMPORTEMENT :
1. **Incarne le patient** : Parle toujours à la première personne du singulier ("Je"). Agis comme un humain face à un médecin.
2. **Zéro jargon médical** : Tu n'y connais rien en médecine. Traduis les informations médicales du contexte en langage courant. Par exemple, si ton dossier indique "Cholécystectomie", dis "On m'a enlevé la vésicule biliaire" ; si c'est écrit "Lombalgie", dis "Je me suis bloqué le dos". Ne donne JAMAIS la réponse au médecin.
3. **Réponds UNIQUEMENT à la question posée** : Ne déballe pas tout ton dossier. Si on te demande tes allergies, ne parle pas de tes opérations passées. L'étudiant doit mériter les informations en posant les bonnes questions.
4. **Respecte ton dossier** : Base-toi UNIQUEMENT sur les fragments de contexte fournis. N'invente aucun symptôme, antécédent ou voyage qui n'y figure pas.
5. **Gestion de l'inconnu** : Si l'étudiant te pose une question dont la réponse n'est pas dans le contexte, réponds simplement comme un patient normal : "Non, rien de particulier", "Je ne sais pas", ou "Non, pas à ma connaissance".
6. **Personnalité** : Adapte ton ton à l'âge, au sexe et au comportement du patient (ex: anxieux, bavard, minimisateur) si ces éléments transparaissent dans le contexte.

INSTRUCTIONS ÉCRITURES RÉPONSE :
- answer_text : La réponse du patient à l'étudiant, en respectant les règles ci-dessus.
- used_fact_ids : Liste des IDs des fragments de contexte utilisés pour formuler la réponse.
- contains_new_claim : Indique si la réponse contient une information nouvelle qui n'était pas explicitement mentionnée dans le contexte fourni. Par exemple, si le contexte indique "J'ai eu une appendicectomie", et que le patient répond "Oui, on m'a enlevé l'appendice", cela ne constitue pas une nouvelle information. Mais si le patient répond "Oui, j'ai eu une appendicectomie il y a 5 ans", alors contains_new_claim serait True, car la date n'était pas dans le contexte.
"""

def answer_with_gemini(question, context, history, clinical_state, api_key):
    client = genai.Client(api_key=api_key)
    
    system_instruction = f"{SYSTEM_PROMPT}"
    clinical_state_text = clinical_state if clinical_state else {}
    
    messages = [
        {"role": "user", "parts": [{"text": system_instruction}]},
        {"role": "model", "parts": [{"text": "C'est compris. Je suis dans la peau du patient. J'attends les questions du médecin et j'y répondrai avec mes mots, sans jargon, et sans donner d'autres informations que celles qu'il me demande."}]}
    ]
    
    for msg in history:
        role = "model" if msg["role"] == "assistant" else "user"
        messages.append({"role": role, "parts": [{"text": msg["content"]}]})
        
    user_prompt = f"""Médecin (Étudiant) : {question}
    
[État clinique courant du patient à prendre en compte] :
{clinical_state_text}

[Ton dossier médical caché (utilise-le pour formuler ta réponse sans jamais citer les ID ou le fait que c'est un document)] : 
{context}

Ta réponse de patient :"""
    
    messages.append({"role": "user", "parts": [{"text": user_prompt}]})
    
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=messages,
        config={
            "response_mime_type": "application/json",
            "response_schema": AnswerStruct,
            "temperature": 0.7
        }
    )
    return response.text


def analyze_student_question(question, api_key):
    client = genai.Client(api_key=api_key)

    prompt = f"""Tu es un expert en analyse de dialogue médical.
Analyse la question de l'étudiant en médecine suivante : "{question}"

Instructions :
1. question_type : Catégorise la question (ex: "history", "risk_factors", "travel_history", "family_history", "past_medical_history", "social_history", "treatments", "surgical_history", "allergies", "vitals").
2. target_slots : Extrais les thèmes précis abordés sous forme de mots-clés (ex: "pain_duration", "pain_location", "history_explored", "context_explored", "gynecological_history_explored", "pain_characteristics_explored", "travel_history_explored", "surgical_history_explored", "family_history_explored", "medication_asked", "associated_symptoms_explored", "substance_use_explored", "allergies_asked", "risk_factors_explored", "social_history_explored").
3. requires_retrieval : true si la question nécessite de fouiller le dossier du patient, false si c'est juste une salutation (ex: "Bonjour")."""

    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_schema": QuestionAnalysis,
            "temperature": 0.1
        }
    )
    
    import json
    return json.loads(response.text)


def split_question_analysis(analysis):
    question_type = analysis.get("question_type", "")
    target_slots = analysis.get("target_slots", [])
    requires_retrieval = analysis.get("requires_retrieval", False)
    return question_type, target_slots, requires_retrieval


def split_answer_struct(answer_struct):
    if isinstance(answer_struct, str):
        answer_struct = json.loads(answer_struct)

    answer_text = answer_struct.get("answer_text", "")
    used_fact_ids = answer_struct.get("used_fact_ids", [])
    contains_new_claim = answer_struct.get("contains_new_claim", False)
    return answer_text, used_fact_ids, contains_new_claim