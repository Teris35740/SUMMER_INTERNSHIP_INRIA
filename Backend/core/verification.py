import unicodedata

def fact_id_authorized_by_motor(rows):
    '''Le but sera juste de récuperer tous les fait que le moteur d'état a dit qu'il pouvait récuperer.'''
    authorized_ids = []
    for row in rows:
        metadata = row.get("metadata") or {}
        fact_id = metadata.get("fact_id")
        if fact_id:
            authorized_ids.append(fact_id)
    return authorized_ids

def verification_answer(answer_text, used_fact_ids, contains_new_claim, authorized_fact_ids):
    '''Vérifie si la réponse générée par le LLM est valide en fonction des faits autorisés et de la présence de nouvelles affirmations.'''
    if contains_new_claim is True:
        return False, "La réponse contient de nouvelles affirmations non présentes dans le dossier médical."

    for fact_id in used_fact_ids:
        if fact_id not in authorized_fact_ids:
            return False, f"La réponse contient un fait non autorisé : {fact_id}."
    return True, "La réponse est valide."


def verify_diagnosis(student_diagnosis, expected_diagnosis, gemini_api_key=None):
    '''Vérifie si le diagnostic proposé par l'étudiant correspond au diagnostic attendu.
    Comparaison classique : normalisation (minuscules, accents, trim) + synonymes médicaux.
    Retourne (is_correct: bool, feedback: str).
    '''

    def normalize(text):
        '''Minuscules, suppression des accents, trim, espaces multiples → simple.'''
        text = text.strip().lower()
        text = unicodedata.normalize('NFD', text)
        text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')
        text = ' '.join(text.split())
        return text

    SYNONYMS = {
        "lombalgie": ["lumbago", "mal de dos", "douleur lombaire", "tour de rein"],
        "lumbago": ["lombalgie", "mal de dos", "douleur lombaire", "tour de rein"],
        "infarctus du myocarde": ["crise cardiaque", "idm", "infarctus"],
        "crise cardiaque": ["infarctus du myocarde", "idm", "infarctus"],
        "avc": ["accident vasculaire cerebral", "attaque cerebrale"],
        "accident vasculaire cerebral": ["avc", "attaque cerebrale"],
        "pneumonie": ["pneumopathie", "infection pulmonaire"],
        "pneumopathie": ["pneumonie", "infection pulmonaire"],
        "hypertension arterielle": ["hta"],
        "hta": ["hypertension arterielle"],
        "diabete de type 2": ["diabete type 2", "dt2", "diabete type ii"],
        "insuffisance cardiaque": ["ic", "decompensation cardiaque"],
        "embolie pulmonaire": ["ep"],
        "ep": ["embolie pulmonaire"],
        "infection urinaire": ["iu", "cystite"],
        "cystite": ["infection urinaire", "iu"],
        "appendicite": ["appendicite aigue"],
        "migraine": ["cephalee migraineuse"],
        "sciatique": ["sciatalgie", "lombosciatique"],
        "lombosciatique": ["sciatique", "sciatalgie"],
        "bronchite": ["bronchite aigue"],
        "angine": ["amygdalite", "pharyngite"],
        "gastro-enterite": ["gastro", "gastroenterite"],
        "colique nephretique": ["colique renale"],
    }

    norm_student = normalize(student_diagnosis)
    norm_expected = normalize(expected_diagnosis)

    if norm_student == norm_expected:
        return True, f"Correct ! Le diagnostic est bien « {expected_diagnosis} »."

    if norm_student in norm_expected or norm_expected in norm_student:
        return True, f"Correct ! Le diagnostic est bien « {expected_diagnosis} »."

    expected_synonyms = SYNONYMS.get(norm_expected, [])
    if norm_student in [normalize(s) for s in expected_synonyms]:
        return True, f"Correct ! « {student_diagnosis} » est un synonyme reconnu de « {expected_diagnosis} »."

    student_synonyms = SYNONYMS.get(norm_student, [])
    if norm_expected in [normalize(s) for s in student_synonyms]:
        return True, f"Correct ! « {student_diagnosis} » est un synonyme reconnu de « {expected_diagnosis} »."

    return False, f"Diagnostic incorrect. Le diagnostic attendu était : « {expected_diagnosis} »."