from functools import lru_cache

from google import genai
from pydantic import BaseModel
from typing import List
import json

from ..config import GEMINI_MODEL
from ..config_topics import format_target_slots_for_prompt


@lru_cache(maxsize=4)
def _get_client(api_key):
    return genai.Client(api_key=api_key)

class QuestionAnalysis(BaseModel):
    question_type: str
    target_slots: List[str]
    search_keywords: str
    requires_retrieval: bool

class AnswerStruct(BaseModel):
    answer_text: str
    used_fact_ids: List[str]
    contains_new_claim: bool

class PedagogyAnalysis(BaseModel):
    is_pertinent: bool
    feedback: str
    scientific_keywords: str

class PrescriptionEvaluation(BaseModel):
    molecule_score: float
    dosage_score: float
    route_score: float
    duration_score: float
    contraindications_respected: bool
    overall_score: float
    feedback: str
    expected_molecules: List[str]
    prescribed_molecules: List[str]
    missed_molecules: List[str]
    contraindication_details: str


SYSTEM_PROMPT = """Tu es un patient virtuel participant à un jeu de rôle clinique pour entraîner des étudiants en médecine au diagnostic.

RÈGLES STRICTES DE COMPORTEMENT :
1. **Incarne le patient** : Parle toujours à la première personne du singulier ("Je"). Agis comme un humain face à un médecin.
2. **Zéro jargon médical** : Tu n'y connais rien en médecine. Traduis les informations médicales du contexte en langage courant. Par exemple, si ton dossier indique "Cholécystectomie", dis "On m'a enlevé la vésicule biliaire" ; si c'est écrit "Lombalgie", dis "Je me suis bloqué le dos". Ne donne JAMAIS la réponse au médecin.
3. **Réponds UNIQUEMENT à la question posée** : Ne déballe pas tout ton dossier. Si on te demande tes allergies, ne parle pas de tes opérations passées. L'étudiant doit mériter les informations en posant les bonnes questions.
4. **Respecte ton dossier** : Base-toi UNIQUEMENT sur les fragments de contexte fournis. N'invente aucun symptôme, antécédent ou voyage qui n'y figure pas.
5. **Gestion de l'inconnu** : Si l'étudiant te pose une question dont la réponse n'est pas dans le contexte, réponds simplement comme un patient normal : "Non, rien de particulier", "Je ne sais pas", ou "Non, pas à ma connaissance".
6. **Personnalité** : Adopte scrupuleusement le trait de caractère et l'attitude décrits ci-dessous dans la section [Ta Personnalité]. Ton ton, ton vocabulaire et la longueur de tes réponses doivent refléter cet état d'esprit.

INSTRUCTIONS ÉCRITURES RÉPONSE :
- answer_text : La réponse du patient à l'étudiant, en respectant les règles ci-dessus.
- used_fact_ids : Liste des IDs des fragments de contexte utilisés pour formuler la réponse.
- contains_new_claim : Indique si la réponse contient une information nouvelle qui n'était pas explicitement mentionnée dans le contexte fourni. Par exemple, si le contexte indique "J'ai eu une appendicectomie", et que le patient répond "Oui, on m'a enlevé l'appendice", cela ne constitue pas une nouvelle information. Mais si le patient répond "Oui, j'ai eu une appendicectomie il y a 5 ans", alors contains_new_claim serait True, car la date n'était pas dans le contexte.
"""

def _format_attitude(attitude_dict):
    if not attitude_dict:
        return "Tu as une attitude normale et neutre."
        
    anxiety = attitude_dict.get("anxiety", 0.5)
    precision = attitude_dict.get("precision", 0.5)
    coop = attitude_dict.get("cooperativeness", 0.8)
    
    parts = []
    
    if anxiety >= 0.8:
        parts.append("Tu es très anxieux, inquiet et limite paniqué par ce qui t'arrive.")
    elif anxiety >= 0.6:
        parts.append("Tu es un peu soucieux et nerveux.")
    elif anxiety <= 0.2:
        parts.append("Tu es extrêmement calme, détendu et tu ne t'inquiètes pas du tout.")
    elif anxiety <= 0.4:
        parts.append("Tu es plutôt serein et pas vraiment inquiet.")
        
    if precision >= 0.8:
        parts.append("Tu es extrêmement précis, tu donnes des détails exacts et tu es très factuel.")
    elif precision >= 0.6:
        parts.append("Tu es clair dans tes explications.")
    elif precision <= 0.2:
        parts.append("Tu es très vague, évasif, et tu as beaucoup de mal à décrire clairement tes symptômes.")
    elif precision <= 0.4:
        parts.append("Tu es un peu flou et imprécis dans tes explications.")
        
    if coop >= 0.8:
        parts.append("Tu es très coopératif, amical, et tu as vraiment envie d'aider le médecin.")
    elif coop >= 0.6:
        parts.append("Tu réponds volontiers aux questions de façon polie.")
    elif coop <= 0.2:
        parts.append("Tu es hostile, fermé, réticent à répondre, et tu fais des phrases très courtes voire un peu agressives.")
    elif coop <= 0.4:
        parts.append("Tu es un peu sur la défensive, peu bavard et tu as l'air agacé.")
        
    return " ".join(parts)


def answer_with_gemini(question, context, history, clinical_state, api_key, correction=""):
    client = _get_client(api_key)
    
    system_instruction = f"{SYSTEM_PROMPT}"
    
    clinical_state_dict = clinical_state if clinical_state else {}
    attitude_dict = clinical_state_dict.get("patient_attitude", {})
    attitude_text = _format_attitude(attitude_dict)
    
    messages = [
        {"role": "user", "parts": [{"text": system_instruction}]},
        {"role": "model", "parts": [{"text": "C'est compris. Je suis dans la peau du patient. J'attends les questions du médecin et j'y répondrai avec mes mots, sans jargon, et sans donner d'autres informations que celles qu'il me demande."}]}
    ]
    
    for msg in history:
        role = "model" if msg["role"] == "assistant" else "user"
        messages.append({"role": role, "parts": [{"text": msg["content"]}]})
        
    user_prompt = f"""Médecin (Étudiant) : {question}

[Ta Personnalité (TRÈS IMPORTANT, adapte ton ton en fonction)] :
{attitude_text}
    
[État clinique courant de la consultation (topics abordés, faits révélés)] :
{clinical_state_dict}

[Ton dossier médical caché (utilise-le pour formuler ta réponse sans jamais citer les ID ou le fait que c'est un document)] : 
{context}

Ta réponse de patient :"""

    if correction:
        user_prompt += f"""

==================================================
ALERTE ERREUR SUR TA TENTATIVE PRÉCÉDENTE 
Ton précédent JSON a été rejeté par le système de sécurité pour la raison suivante :
{correction}
Tu DOIS impérativement tenir compte de cette remarque et corriger ta réponse. N'invente aucune information qui n'est pas dans ton dossier.
=================================================="""
    
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
    client = _get_client(api_key)

    target_slots_reference = format_target_slots_for_prompt()

    prompt = f"""Tu es un expert en analyse de dialogue médical.
Analyse la question de l'étudiant en médecine suivante : "{question}"

Instructions, tu dois obligatoirement remplir le champ search_keywords :
1. question_type : Catégorise la question (ex: "history", "risk_factors", "travel_history", "family_history", "past_medical_history", "social_history", "treatments", "surgical_history", "allergies", "vitals").
2. target_slots : Extrais les thèmes précis abordés. Utilise UNIQUEMENT des identifiants de la liste de référence ci-dessous. Tu peux en mettre plusieurs si la question aborde plusieurs thèmes.
3. requires_retrieval : true si la question nécessite de fouiller le dossier du patient, false si c'est juste une salutation (ex: "Bonjour").
4. search_keywords : Génère une courte chaîne contenant uniquement les mots-clés cliniques pertinents, ainsi que le nom du patient ou son id, pour une recherche dans une base de données stricte (retire les mots de liaison, les salutations, etc. Ex: "douleur dos depuis 3 heures" devient "douleur dos 3 heures"). Ajoute les acronymes médicaux courants (ex : tension artérielle = TA etc...).

--- LISTE DE RÉFÉRENCE DES TARGET_SLOTS ---
{target_slots_reference}
--- FIN DE LA LISTE ---"""

    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_schema": QuestionAnalysis,
            "temperature": 0.1
        }
    )
    
    return json.loads(response.text)


def split_question_analysis(analysis):
    question_type = analysis.get("question_type", "")
    target_slots = analysis.get("target_slots", [])
    requires_retrieval = analysis.get("requires_retrieval", False)
    search_keywords = analysis.get("search_keywords", "")
    return question_type, target_slots, requires_retrieval, search_keywords


def split_answer_struct(answer_struct):
    if isinstance(answer_struct, str):
        answer_struct = json.loads(answer_struct)

    answer_text = answer_struct.get("answer_text", "")
    used_fact_ids = answer_struct.get("used_fact_ids", [])
    contains_new_claim = answer_struct.get("contains_new_claim", False)
    return answer_text, used_fact_ids, contains_new_claim


TEST_PDF_PROMPT = """Tu es un assistant IA spécialisé dans l'analyse de documents médicaux.
Ta tâche est de répondre à la question de l'utilisateur en utilisant UNIQUEMENT le contexte fourni.
Le contexte provient d'une extraction de documents (ex: PDF). 
Si la réponse n'est pas dans le contexte, indique simplement que l'information n'est pas disponible dans les documents fournis.
"""

def test_pdf_answer_with_gemini(question, context, api_key):
    client = _get_client(api_key)
    
    prompt = f"""{TEST_PDF_PROMPT}

[Contexte issu du document] :
{context}

[Question] :
{question}

Réponse :"""
    
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config={
            "temperature": 0.2
        }
    )
    return response.text

def evaluate_student_question_pedagogy(question, expected_diagnosis, history, api_key):
    client = _get_client(api_key)
    
    past_history_str = ""
    patient_answer = ""
    
    # On isole l'échange actuel (les 2 derniers messages) du reste de l'historique
    if len(history) >= 2 and history[-2]['role'] == 'user' and history[-1]['role'] == 'assistant':
        past_msgs = history[:-2]
        patient_answer = history[-1]['content']
    else:
        past_msgs = history
        
    for msg in past_msgs:
        past_history_str += f"{msg['role']}: {msg['content']}\n"
    
    prompt = f"""Tu es un professeur de médecine supervisant un étudiant.
L'étudiant interroge un patient virtuel dont le diagnostic final attendu est : "{expected_diagnosis}".

Historique de la consultation (avant cet échange) :
{past_history_str if past_history_str else "Aucun échange précédent, c'est le début de la consultation."}

Échange actuel :
Étudiant : "{question}"
Réponse du patient : "{patient_answer}"

Instructions :
1. is_pertinent : true si la question de l'étudiant est pertinente et justifiée à ce stade de la consultation, false sinon.
2. feedback : Rédige un court retour pédagogique direct et bienveillant (2-3 phrases) adressé à l'étudiant. Évalue sa question en tenant compte de l'historique de la consultation. Dis-lui si sa question est bonne, bien formulée, ou si elle manque de précision.
3. scientific_keywords : Génère 2 à 4 mots-clés pertinents pour chercher des informations théoriques dans des documents scientifiques (cours, recommandations) en lien avec la question et le diagnostic.
"""
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_schema": PedagogyAnalysis,
            "temperature": 0.2
        }
    )
    return json.loads(response.text)

def generate_pedagogical_synthesis(question, sci_context, api_key, strict_rag=False):
    client = _get_client(api_key)
    
    rag_instruction = "Tu dois te baser STRICTEMENT sur les extraits théoriques fournis. Si l'information ne s'y trouve pas, indique simplement qu'aucune notion théorique précise n'a été trouvée dans la base." if strict_rag else "Tu peux t'appuyer sur tes propres connaissances médicales si les documents fournis ne suffisent pas, mais priorise les extraits théoriques fournis."
    
    prompt = f"""Tu es un professeur de médecine expérimenté qui s'adresse à son étudiant en médecine.
L'étudiant vient de poser cette question dans le cadre d'une consultation virtuelle : "{question}"

Voici des extraits de documents scientifiques (cours, recommandations) récupérés dans notre base de données concernant ce sujet :
{sci_context if sci_context else "Aucun document trouvé."}

Instructions :
1. Formule une revue de cours très rapide (1 à 2 points clés concis) en lien avec la question.
2. Adresse-toi directement à l'étudiant avec bienveillance.
3. {rag_instruction}
4. Sois extrêmement bref, clair et percutant (format puces recommandé). N'utilise pas de jargon sans l'expliquer.
"""
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config={
            "temperature": 0.3
        }
    )
    return response.text


def evaluate_prescription_with_gemini(student_prescription, expected_treatment, patient_data, api_key):
    """Évalue la prescription de l'étudiant en la comparant au traitement attendu.
    
    Utilise Gemini avec structured output pour obtenir des scores granulaires.
    Retourne un dict avec les scores et le feedback.
    """
    client = _get_client(api_key)
    
    # Extraire le contexte patient pertinent pour l'évaluation des CI
    patient = patient_data.get("patient", {})
    allergies = patient.get("allergies", [])
    treatments = patient.get("treatments", [])
    pmh = patient.get("past_medical_history", [])
    
    patient_context = {
        "allergies": [a.get("information", "") for a in allergies],
        "traitements_en_cours": [t.get("information", "") for t in treatments],
        "antecedents": [p.get("information", "") for p in pmh],
    }
    
    prompt = f"""Tu es un pharmacologue expert évaluant l'ordonnance d'un étudiant en médecine.

PRESCRIPTION ATTENDUE (référence) :
{json.dumps(expected_treatment, ensure_ascii=False, indent=2)}

DONNÉES DU PATIENT (pour vérifier les contre-indications) :
{json.dumps(patient_context, ensure_ascii=False, indent=2)}

PRESCRIPTION DE L'ÉTUDIANT :
{json.dumps(student_prescription, ensure_ascii=False, indent=2)}

INSTRUCTIONS D'ÉVALUATION :
1. **molecule_score** (0.0 à 1.0) : Compare les molécules prescrites avec celles attendues. Accepte les noms commerciaux courants (ex: Doliprane = Paracétamol, Advil = Ibuprofène, Nurofen = Ibuprofène, Monuril = Fosfomycine, Imigrane = Sumatriptan). Score 1.0 si toutes les molécules attendues sont prescrites, 0.0 si aucune.
2. **dosage_score** (0.0 à 1.0) : Évalue si la posologie est dans les fourchettes thérapeutiques acceptables. Sois tolérant sur les formulations (ex: "1g x3/j" est acceptable pour "1g toutes les 6 heures").
3. **route_score** (0.0 à 1.0) : Vérifie si la voie d'administration est correcte.
4. **duration_score** (0.0 à 1.0) : Vérifie si la durée du traitement est appropriée (fourchette acceptable).
5. **contraindications_respected** : true si l'étudiant n'a PAS prescrit de médicament contre-indiqué pour ce patient, false sinon.
6. **overall_score** (0.0 à 1.0) : Score global pondéré de la prescription. Formule suggérée : 0.35×molecule + 0.25×dosage + 0.15×route + 0.15×duration + 0.10×(1.0 si CI respectées, 0.0 sinon).
7. **feedback** : Retour pédagogique bref (2-3 phrases) en français, bienveillant, expliquant les points forts et les erreurs.
8. **expected_molecules** : Liste des noms de molécules attendues.
9. **prescribed_molecules** : Liste des noms de molécules prescrites par l'étudiant (normalisés en DCI).
10. **missed_molecules** : Liste des molécules attendues qui n'ont pas été prescrites.
11. **contraindication_details** : Explication brève des contre-indications vérifiées et si elles ont été respectées."""

    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_schema": PrescriptionEvaluation,
            "temperature": 0.1
        }
    )
    return json.loads(response.text)