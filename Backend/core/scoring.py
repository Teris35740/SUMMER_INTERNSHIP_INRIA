"""
Module de scoring de l'étudiant.

Calcule 5 indicateurs :
- Couverture de l'anamnèse (coverage)
- Pertinence des questions (pertinence)
- Structure de l'entretien (structure)
- Performance diagnostique (diagnostic)
- Qualité de la prescription (prescription)

Score final = w1·Coverage + w2·Pertinence + w3·Structure + w4·Diagnostic + w5·Prescription
"""

from core.config import SCORING_WEIGHTS, IDEAL_TOPIC_ORDER, SECTION_TO_TOPIC, SESSION_TIME_LIMIT


# ── Fonctions utilitaires ──────────────────────────────────────────────

def _flatten_asked_topics(asked_topics_history):
    """Aplatit la liste de listes de topics en un set unique."""
    flat = set()
    for topic_group in asked_topics_history:
        if isinstance(topic_group, list):
            for topic in topic_group:
                flat.add(topic)
        else:
            flat.add(topic_group)
    return flat


def _extract_important_topics(patient_data):
    """Extrait les topics importants à partir des sections du dossier patient.

    Une section est importante si elle existe et contient des données.
    Le mapping section → topic est défini dans SECTION_TO_TOPIC.
    """
    patient = patient_data.get("patient", {})
    important_topics = set()

    for section_name, topic_name in SECTION_TO_TOPIC.items():
        section_data = patient.get(section_name)
        if section_data:
            # chief_complaint est un dict, les autres sont des listes
            if isinstance(section_data, dict) and section_data.get("information"):
                important_topics.add(topic_name)
            elif isinstance(section_data, list) and len(section_data) > 0:
                important_topics.add(topic_name)

    return important_topics


def _ordered_first_appearances(asked_topics_history, reference_set):
    """Retourne les topics dans l'ordre de leur première apparition,
    filtrés pour ne garder que ceux présents dans reference_set."""
    ordered = []
    seen = set()
    for topic_group in asked_topics_history:
        topics = topic_group if isinstance(topic_group, list) else [topic_group]
        for topic in topics:
            if topic not in seen and topic in reference_set:
                ordered.append(topic)
                seen.add(topic)
    return ordered


def _kendall_tau(x, y):
    """Calcule le coefficient de corrélation de rang de Kendall tau.

    Retourne un float dans [-1, 1].
    Implémenté sans dépendance externe (pas besoin de scipy).
    """
    n = len(x)
    if n < 2:
        return 1.0

    concordant = 0
    discordant = 0

    for i in range(n):
        for j in range(i + 1, n):
            sign_x = x[i] - x[j]
            sign_y = y[i] - y[j]
            product = sign_x * sign_y
            if product > 0:
                concordant += 1
            elif product < 0:
                discordant += 1

    total = concordant + discordant
    if total == 0:
        return 1.0

    return (concordant - discordant) / total


# ── Calcul des sous-scores ─────────────────────────────────────────────

def compute_coverage(asked_topics_history, patient_data):
    """Couverture de l'anamnèse : proportion de thèmes importants explorés.

    Retourne un float dans [0, 1].
    """
    important = _extract_important_topics(patient_data)
    if not important:
        return 1.0  # Pas de thèmes importants → couverture parfaite par défaut

    explored = _flatten_asked_topics(asked_topics_history)
    covered = explored & important
    return len(covered) / len(important)


def compute_pertinence(useful_count, total_count):
    """Pertinence des questions : ratio questions utiles / total.

    Une question est utile si requires_retrieval == True.
    Retourne un float dans [0, 1].
    """
    if total_count <= 0:
        return 0.0
    return min(1.0, useful_count / total_count)


def compute_structure(asked_topics_history, ideal_order=None):
    """Structure de l'entretien : cohérence de l'ordre d'exploration.

    Compare l'ordre d'exploration de l'étudiant à l'ordre clinique idéal
    via le coefficient de Kendall tau, normalisé sur [0, 1].

    Retourne un float dans [0, 1].
    """
    if ideal_order is None:
        ideal_order = IDEAL_TOPIC_ORDER

    reference_set = set(ideal_order)
    student_order = _ordered_first_appearances(asked_topics_history, reference_set)

    if len(student_order) < 2:
        return 1.0  # Pas assez de topics pour évaluer l'ordre

    # Rangs dans l'ordre idéal pour chaque topic exploré
    ideal_ranks = [ideal_order.index(t) for t in student_order]
    # Rangs dans l'ordre de l'étudiant (0, 1, 2, ...)
    student_ranks = list(range(len(student_order)))

    tau = _kendall_tau(student_ranks, ideal_ranks)

    # Normaliser de [-1, 1] vers [0, 1]
    return (tau + 1) / 2


def compute_diagnostic(is_correct, elapsed_seconds, time_limit=None):
    """Performance diagnostique basée sur le temps.

    - Diagnostic incorrect → 0.0
    - Diagnostic correct dans le temps → score d'efficacité (bonus si rapide)
    - Diagnostic correct hors temps → 0.3 (pénalité pour dépassement)

    Retourne un float dans [0, 1].
    """
    if time_limit is None:
        time_limit = SESSION_TIME_LIMIT

    if not is_correct:
        return 0.0

    if elapsed_seconds > time_limit:
        return 0.3

    time_remaining_ratio = (time_limit - elapsed_seconds) / time_limit
    return 0.5 + 0.5 * time_remaining_ratio


def compute_prescription(prescription_score):
    """Qualité de la prescription thérapeutique.

    Le score est directement issu de l'évaluation LLM (overall_score).
    Retourne un float dans [0, 1].
    """
    if prescription_score is None:
        return 0.0
    return max(0.0, min(1.0, float(prescription_score)))


# ── Score final et rapport ─────────────────────────────────────────────

def compute_final_score(coverage, pertinence, structure, diagnostic, prescription=0.0, weights=None):
    """Calcule le score final pondéré.

    Score = w1·Coverage + w2·Pertinence + w3·Structure + w4·Diagnostic + w5·Prescription

    Retourne un float dans [0, 1].
    """
    if weights is None:
        weights = SCORING_WEIGHTS

    return (
        weights["w1_coverage"] * coverage
        + weights["w2_pertinence"] * pertinence
        + weights["w3_structure"] * structure
        + weights["w4_diagnostic"] * diagnostic
        + weights["w5_prescription"] * prescription
    )


def _score_to_grade(score):
    """Convertit un score [0, 1] en note lettrée."""
    if score >= 0.90:
        return "A"
    elif score >= 0.75:
        return "B"
    elif score >= 0.60:
        return "C"
    elif score >= 0.40:
        return "D"
    else:
        return "F"


def generate_report(asked_topics_history, patient_data, useful_count, total_count,
                    is_correct, elapsed_seconds, useful_questions_list=None,
                    prescription_score=None, prescription_details=None):
    """Génère un rapport complet de notation de l'étudiant.

    Retourne un dict structuré avec les sous-scores, le score final,
    la note lettrée, et un feedback textuel.
    """
    coverage = compute_coverage(asked_topics_history, patient_data)
    pertinence = compute_pertinence(useful_count, total_count)
    structure = compute_structure(asked_topics_history)
    diagnostic = compute_diagnostic(is_correct, elapsed_seconds)
    prescription = compute_prescription(prescription_score)

    final_score = compute_final_score(coverage, pertinence, structure, diagnostic, prescription)
    grade = _score_to_grade(final_score)

    # Détail des topics pour le feedback
    important = _extract_important_topics(patient_data)
    explored = _flatten_asked_topics(asked_topics_history)
    missed = important - explored

    # Formater le temps écoulé en mm:ss
    minutes = int(elapsed_seconds // 60)
    seconds = int(elapsed_seconds % 60)
    time_str = f"{minutes}:{seconds:02d}"
    time_limit_str = f"{SESSION_TIME_LIMIT // 60}:{SESSION_TIME_LIMIT % 60:02d}"
    within_time = elapsed_seconds <= SESSION_TIME_LIMIT

    return {
        "scores": {
            "coverage": round(coverage, 2),
            "pertinence": round(pertinence, 2),
            "structure": round(structure, 2),
            "diagnostic": round(diagnostic, 2),
            "prescription": round(prescription, 2),
        },
        "weights": SCORING_WEIGHTS,
        "final_score": round(final_score, 2),
        "grade": grade,
        "details": {
            "important_topics": sorted(important),
            "explored_topics": sorted(explored & important),
            "missed_topics": sorted(missed),
            "useful_questions": useful_count,
            "useful_questions_list": useful_questions_list or [],
            "total_questions": total_count,
            "diagnosis_correct": is_correct,
            "elapsed_time": time_str,
            "time_limit": time_limit_str,
            "within_time": within_time,
            "elapsed_seconds": round(elapsed_seconds, 1),
            "prescription_details": prescription_details,
        },
    }


def format_report(report):
    """Formate un rapport de scoring pour affichage en console."""
    scores = report["scores"]
    weights = report["weights"]
    details = report["details"]
    lines = [
        "",
        "╔══════════════════════════════════════════════════╗",
        "║           RAPPORT DE NOTATION ÉTUDIANT           ║",
        "╠══════════════════════════════════════════════════╣",
        f"║  Couverture anamnèse  (×{weights['w1_coverage']:.2f}) :  {scores['coverage']:.2f}  / 1.00    ║",
        f"║  Pertinence questions (×{weights['w2_pertinence']:.2f}) :  {scores['pertinence']:.2f}  / 1.00    ║",
        f"║  Structure entretien  (×{weights['w3_structure']:.2f}) :  {scores['structure']:.2f}  / 1.00    ║",
        f"║  Perf. diagnostique   (×{weights['w4_diagnostic']:.2f}) :  {scores['diagnostic']:.2f}  / 1.00    ║",
        f"║  Prescription         (×{weights['w5_prescription']:.2f}) :  {scores['prescription']:.2f}  / 1.00    ║",
        "╠══════════════════════════════════════════════════╣",
        f"║  SCORE FINAL :  {report['final_score']:.2f}  / 1.00    Note : {report['grade']}         ║",
        "╚══════════════════════════════════════════════════╝",
    ]

    if details["missed_topics"]:
        lines.append(f"\n  Thèmes non explorés : {', '.join(details['missed_topics'])}")

    lines.append(f"  Questions utiles : {details['useful_questions']}/{details['total_questions']}")
    if details.get("useful_questions_list"):
        lines.append("  Liste des questions utiles :")
        for q in details["useful_questions_list"]:
            lines.append(f"    - {q}")

    # Temps de consultation
    elapsed = details.get('elapsed_time', '?')
    limit = details.get('time_limit', '10:00')
    within = details.get('within_time', True)
    time_status = '✓ dans le temps' if within else '✗ hors temps'
    lines.append(f"  Temps : {elapsed} / {limit} ({time_status})")
            
    lines.append(f"  Diagnostic {'correct ✓' if details['diagnosis_correct'] else 'incorrect ✗'}")
    lines.append("")
    
    return "\n".join(lines)
