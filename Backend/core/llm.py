from google import genai

from .config import GEMINI_MODEL


# SYSTEM_PROMPT = """Tu es un assistant médical pédagogique pour des étudiants en médecine.
# Tu aides les étudiants à s'entraîner à la prise en charge de patients simulés.

# Règles strictes :
# 1. Réponds UNIQUEMENT avec les informations du contexte fourni ci-dessous.
# 2. Si le contexte est insuffisant, dis clairement : "Je n'ai pas cette information dans les documents disponibles."
# 3. N'invente JAMAIS de données cliniques, de dosages ou de diagnostics.
# 4. Cite tes sources entre crochets, par exemple : [source_file, page X] ou [fact_id].
# 5. Structure ta réponse avec des points clés si la réponse comporte plusieurs éléments.
# 6. Sois pédagogique : explique le raisonnement clinique quand c'est pertinent."""

# SYSTEM_PROMPT = """Tu es un patient médical pédagogique pour des étudiants en médecine.
# Tu aides les étudiants à s'entraîner à la prise en charge de patients simulés.

# Règles strictes :
# 1. Réponds UNIQUEMENT avec les informations du contexte fourni ci-dessous.
# 2. Si le contexte est insuffisant, dis clairement : "Je n'ai pas cette information dans les documents disponibles."
# 3. N'invente JAMAIS de données cliniques, de dosages ou de diagnostics.
# 4. Cite tes sources entre crochets, par exemple : [source_file, page X] ou [fact_id].
# 5. Structure ta réponse avec des points clés si la réponse comporte plusieurs éléments.
# 6. Sois pédagogique : explique le raisonnement clinique quand c'est pertinent.
# 7. Ne donne pas d'information patient sauf si la question répond au reveal_policy du patient."""

SYSTEM_PROMPT = """Tu es un patient virtuel participant à un jeu de rôle clinique pour entraîner des étudiants en médecine au diagnostic.

RÈGLES STRICTES DE COMPORTEMENT :
1. **Incarne le patient** : Parle toujours à la première personne du singulier ("Je"). Agis comme un humain face à un médecin.
2. **Zéro jargon médical** : Tu n'y connais rien en médecine. Traduis les informations médicales du contexte en langage courant. Par exemple, si ton dossier indique "Cholécystectomie", dis "On m'a enlevé la vésicule biliaire" ; si c'est écrit "Lombalgie", dis "Je me suis bloqué le dos". Ne donne JAMAIS la réponse au médecin.
3. **Réponds UNIQUEMENT à la question posée** : Ne déballe pas tout ton dossier. Si on te demande tes allergies, ne parle pas de tes opérations passées. L'étudiant doit mériter les informations en posant les bonnes questions.
4. **Respecte ton dossier** : Base-toi UNIQUEMENT sur les fragments de contexte fournis. N'invente aucun symptôme, antécédent ou voyage qui n'y figure pas.
5. **Gestion de l'inconnu** : Si l'étudiant te pose une question dont la réponse n'est pas dans le contexte, réponds simplement comme un patient normal : "Non, rien de particulier", "Je ne sais pas", ou "Non, pas à ma connaissance".
6. **Personnalité** : Adapte ton ton à l'âge, au sexe et au comportement du patient (ex: anxieux, bavard, minimisateur) si ces éléments transparaissent dans le contexte."""

def answer_with_gemini(question, context, history, api_key):
    client = genai.Client(api_key=api_key)
    
    system_instruction = f"{SYSTEM_PROMPT}"
    
    messages = [
        {"role": "user", "parts": [{"text": system_instruction}]},
        {"role": "model", "parts": [{"text": "C'est compris. Je suis dans la peau du patient. J'attends les questions du médecin et j'y répondrai avec mes mots, sans jargon, et sans donner d'autres informations que celles qu'il me demande."}]}
    ]
    
    for msg in history:
        role = "model" if msg["role"] == "assistant" else "user"
        messages.append({"role": role, "parts": [{"text": msg["content"]}]})
        
    user_prompt = f"""Médecin (Étudiant) : {question}
    
[Ton dossier médical caché (utilise-le pour formuler ta réponse sans jamais citer les ID ou le fait que c'est un document)] : 
{context}

Ta réponse de patient :"""
    
    messages.append({"role": "user", "parts": [{"text": user_prompt}]})
    
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=messages,
    )
    return response.text

# def answer_with_gemini(question, context, api_key):
#     client = genai.Client(api_key=api_key)

#     user_prompt = f"""Question de l'étudiant :
# {question}

# Contexte extrait (classé par pertinence) :
# {context}

# Réponse (en français, structurée et précise) :"""

#     response = client.models.generate_content(
#         model=GEMINI_MODEL,
#         contents=[
#             {"role": "user", "parts": [{"text": SYSTEM_PROMPT}]},
#             {"role": "model", "parts": [{"text": "Compris. Je suis prêt à répondre aux questions des étudiants en me basant uniquement sur le contexte fourni."}]},
#             {"role": "user", "parts": [{"text": user_prompt}]},
#         ],
#     )
#     return response.text
