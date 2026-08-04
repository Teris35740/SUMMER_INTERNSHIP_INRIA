"""
Registre centralisé des topics / target_slots du système.

Ce fichier est la référence unique pour :
- Les `target_slots` que le LLM produit lors de l'analyse de la question
- Les topics utilisés dans les `reveal_policy` des dossiers patients
- Le prompt d'analyse de question (`analyze_student_question`)

Convention de nommage des reveal_policy :
- `direct_if_asked` : toujours autorisé
- `direct_if_<topic>` : autorisé si le topic est exploré (info donnée facilement)
- `only_if_<topic>` : autorisé si le topic est exploré (info donnée si on creuse)
"""

# ── Topics principaux (sections du dossier) ───────────────────────────
# Ces topics correspondent à des sections entières du dossier patient.
# Ils sont utilisés dans SECTION_TO_TOPIC et IDEAL_TOPIC_ORDER.

SECTION_TOPICS = {
    "context_explored":             "Motif de consultation, raison de la venue",
    "history_explored":             "Histoire de la maladie, évolution des symptômes",
    "past_medical_history_explored": "Antécédents médicaux personnels",
    "surgical_history_explored":    "Antécédents chirurgicaux",
    "family_history_explored":      "Antécédents familiaux",
    "medication_asked":             "Traitements en cours, médicaments",
    "allergies_asked":              "Allergies connues",
    "substance_use_explored":       "Consommation de substances (tabac, alcool, drogues)",
    "social_history_explored":      "Mode de vie, profession, situation familiale",
    "travel_history_explored":      "Voyages récents",
    "risk_factors_explored":        "Facteurs de risque",
    "vitals_measured":              "Constantes vitales (TA, FC, T°, SpO2)",
}


# ── Topics granulaires (sous-thèmes) ──────────────────────────────────
# Ces topics correspondent à des questions plus précises de l'étudiant.
# Ils sont utilisés dans les reveal_policy `direct_if_*` et `only_if_*`.

GRANULAR_TOPICS = {
    # -- Histoire de la maladie (détails) --
    "asked_about_onset":            "Circonstances de déclenchement",
    "pain_scale_asked":             "Intensité de la douleur (EVA, échelle 1-10)",
    "pain_type_asked":              "Type et localisation de la douleur",
    "pain_characteristics_explored": "Caractéristiques de la douleur (type, durée, rythme)",
    "irradiation_explored":         "Irradiation de la douleur",
    "aggravating_factors_asked":    "Facteurs aggravants",
    "alleviating_factors_asked":    "Facteurs calmants / soulageants",
    "red_flags_explored":           "Signes de gravité / drapeaux rouges",
    "associated_symptoms_explored": "Symptômes associés",
    "evolution_explored":           "Évolution des symptômes dans le temps",

    # -- Antécédents (détails) --
    "past_back_pain_asked":         "Antécédents de douleurs dorsales",
    "respiratory_history_asked":    "Antécédents respiratoires",
    "cardiac_history_asked":        "Antécédents cardiaques",
    "digestive_history_asked":      "Antécédents digestifs",
    "urinary_history_asked":        "Antécédents urinaires",
    "gynecological_history_explored": "Antécédents gynécologiques",
    "neurological_history_asked":   "Antécédents neurologiques",
    "psychiatric_history_asked":    "Antécédents psychiatriques",

    # -- Traitements (détails) --
    "self_medication_asked":        "Automédication (ce que le patient a pris de lui-même)",
    "treatments_asked":             "Traitements médicaux prescrits",

    # -- Allergies (détails) --
    "drug_allergies_specifically_asked": "Allergies médicamenteuses spécifiquement",

    # -- Mode de vie (détails) --
    "tobacco_asked":                "Consommation de tabac",
    "alcohol_asked":                "Consommation d'alcool",
    "job_explored":                 "Profession et conditions de travail",
    "lifestyle_habits_asked":       "Habitudes de vie (sport, alimentation, sommeil)",
    "social_context_explored":      "Contexte social (famille, entourage, logement)",

    # -- Antécédents familiaux (détails) --
    "family_history_asked":         "Antécédents familiaux (détail)",

    # -- Chirurgie (détails) --
    "surgical_history_asked":       "Antécédents chirurgicaux (détail)",

    # -- Voyages (détails) --
    "travel_asked":                 "Voyages récents (détail)",

    # -- Antécédents médicaux (détails) --
    "medical_history_asked":        "Antécédents médicaux (détail)",
}


# ── Tous les topics (union) ───────────────────────────────────────────
ALL_TOPICS = {**SECTION_TOPICS, **GRANULAR_TOPICS}


# ── Formattage pour le prompt LLM ─────────────────────────────────────
def format_target_slots_for_prompt():
    """Génère la liste des target_slots formatée pour le prompt d'analyse de question."""
    lines = []
    lines.append("Topics principaux (sections du dossier) :")
    for topic, desc in SECTION_TOPICS.items():
        lines.append(f'  - "{topic}" : {desc}')
    lines.append("")
    lines.append("Topics granulaires (sous-thèmes, pour des questions plus précises) :")
    for topic, desc in GRANULAR_TOPICS.items():
        lines.append(f'  - "{topic}" : {desc}')
    return "\n".join(lines)
