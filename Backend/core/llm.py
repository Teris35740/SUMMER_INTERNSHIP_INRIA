from google import genai

from core.config import GEMINI_MODEL


SYSTEM_PROMPT = """Tu es un assistant médical pédagogique pour des étudiants en médecine.
Tu aides les étudiants à s'entraîner à la prise en charge de patients simulés.

Règles strictes :
1. Réponds UNIQUEMENT avec les informations du contexte fourni ci-dessous.
2. Si le contexte est insuffisant, dis clairement : "Je n'ai pas cette information dans les documents disponibles."
3. N'invente JAMAIS de données cliniques, de dosages ou de diagnostics.
4. Cite tes sources entre crochets, par exemple : [source_file, page X] ou [fact_id].
5. Structure ta réponse avec des points clés si la réponse comporte plusieurs éléments.
6. Sois pédagogique : explique le raisonnement clinique quand c'est pertinent."""

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


def answer_with_gemini(question, context, api_key):
    client = genai.Client(api_key=api_key)

    user_prompt = f"""Question de l'étudiant :
{question}

Contexte extrait (classé par pertinence) :
{context}

Réponse (en français, structurée et précise) :"""

    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=[
            {"role": "user", "parts": [{"text": SYSTEM_PROMPT}]},
            {"role": "model", "parts": [{"text": "Compris. Je suis prêt à répondre aux questions des étudiants en me basant uniquement sur le contexte fourni."}]},
            {"role": "user", "parts": [{"text": user_prompt}]},
        ],
    )
    return response.text
