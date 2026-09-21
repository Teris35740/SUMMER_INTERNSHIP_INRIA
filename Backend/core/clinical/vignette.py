SECTION_LABELS = {
    "chief_complaint": "Motif de consultation",
    "history": "Histoire de la maladie",
    "past_medical_history": "Antécédents médicaux",
    "surgical_history": "Antécédents chirurgicaux",
    "family_history": "Antécédents familiaux",
    "treatments": "Traitements en cours",
    "allergies": "Allergies",
    "social_history": "Contexte social & professionnel",
    "travel_history": "Voyages récents",
    "risk_factors": "Facteurs de risque",
    "vitals": "Constantes vitales",
}


def _build_fact_index(patient_data):
    """Construit un index fact_id -> (section_name, information).

    Parcourt toutes les sections du JSON patient pour indexer
    chaque entrée par son fact_id.
    """
    patient = patient_data.get("patient", {})
    index = {}

    for section_name in SECTION_LABELS:
        section = patient.get(section_name)
        if section is None:
            continue

        # chief_complaint est un dict unique les autres sont des listes
        if isinstance(section, dict):
            fact_id = section.get("fact_id")
            if fact_id:
                index[fact_id] = (section_name, section.get("information", ""))
        elif isinstance(section, list):
            for entry in section:
                fact_id = entry.get("fact_id")
                if fact_id:
                    index[fact_id] = (section_name, entry.get("information", ""))

    return index


def generate_clinical_vignette(patient_data, clinical_state):
    """Génère une vignette clinique lisible à partir des faits révélés.

    Résout chaque fact_id en son texte 'information' correspondant
    dans le JSON patient, puis organise le résultat par section.

    Args:
        patient_data: Le dict complet du JSON patient
        clinical_state: L'état clinique de la session (contient revealed_facts)

    Returns:
        Un str formaté en Markdown, prêt à être affiché sur le frontend.
        Retourne une chaîne vide si aucun fait n'est révélé.
    """
    if not patient_data or not clinical_state:
        return ""

    revealed_facts = clinical_state.get("revealed_facts", [])
    if not revealed_facts:
        return ""

    flat_fact_ids = set()
    for item in revealed_facts:
        if isinstance(item, list):
            for fid in item:
                if isinstance(fid, str):
                    flat_fact_ids.add(fid)
        elif isinstance(item, str):
            flat_fact_ids.add(item)

    if not flat_fact_ids:
        return ""

    fact_index = _build_fact_index(patient_data)

    # Regrouper les informations révélées par section
    sections = {}
    for fact_id in flat_fact_ids:
        if fact_id in fact_index:
            section_name, information = fact_index[fact_id]
            if section_name not in sections:
                sections[section_name] = []
            sections[section_name].append(information)

    if not sections:
        return ""

    # Construire la vignette ordonnée selon l'ordre des SECTION_LABELS
    identity = patient_data.get("patient", {}).get("identity", {})
    age = identity.get("age", "?")
    gender = identity.get("gender", "Patient")

    lines = [f"**{gender.capitalize()}, {age} ans**\n"]

    for section_key in SECTION_LABELS:
        if section_key in sections:
            label = SECTION_LABELS[section_key]
            lines.append(f"### {label}")
            for info in sections[section_key]:
                lines.append(f"- {info}")
            lines.append("")

    return "\n".join(lines)
