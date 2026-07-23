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