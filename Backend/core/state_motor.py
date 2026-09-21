from core.datalog_engine import get_ruleset

def _extract_topic_from_policy(reveal_policy):
    """Extrait le topic requis d'une reveal_policy.

    Conventions :
    - "direct_if_asked"       → None (toujours autorisé)
    - "direct_if_<topic>"     → "<topic>" (autorisé si topic exploré, info donnée facilement)
    - "only_if_<topic>"       → "<topic>" (autorisé si topic exploré, info donnée si on creuse)
    - autre                   → None
    """
    if reveal_policy == "direct_if_asked":
        return None
    if reveal_policy.startswith("direct_if_"):
        return reveal_policy[len("direct_if_"):]
    if reveal_policy.startswith("only_if_"):
        return reveal_policy[len("only_if_"):]
    return None


def state_motor_simple(target_slots, rows):
    """
    Filtre les documents récupérés par le RAG. 
    Conserve les documents si équivalence entre les target_slots de la question 
    et la reveal_policy du fait médical.
    """
    authorized_rows = []
    
    for row in rows:
        source_type = row.get("source_type", "unknown")
        
        if source_type == "reference":
            authorized_rows.append(row)
            continue
            
        reveal_policy = row.get("metadata", {}).get("reveal_policy", "unknown")
        
        if reveal_policy == "direct_if_asked":
            authorized_rows.append(row)
            continue

        # Gestion des patterns direct_if_<topic> et only_if_<topic>
        required_topic = _extract_topic_from_policy(reveal_policy)
        if required_topic is not None:
            if any(slot in required_topic or required_topic in slot for slot in target_slots):
                authorized_rows.append(row)
                continue
            
    return authorized_rows

def state_motor_advanced(global_asked_topics, current_target_slots, rows):
    """
    Filtre les informations du RAG en utilisant la mémoire complète de la session.
    Retourne (authorized_rows, blocked_rows) pour la traçabilité.
    """
    all_explored_topics = set()
    for topic_group in global_asked_topics:
        if isinstance(topic_group, list):
            for topic in topic_group:
                all_explored_topics.add(topic)
        else:
            all_explored_topics.add(topic_group)
            
    for slot in current_target_slots:
        all_explored_topics.add(slot)

    authorized_rows = []
    blocked_rows = []
    
    for row in rows:
        source_type = row.get("source_type", "unknown")
        
        if source_type == "reference":
            authorized_rows.append(row)
            continue
            
        reveal_policy = row.get("metadata", {}).get("reveal_policy", "unknown")
        fact_id = row.get("metadata", {}).get("fact_id", "?")
        
        # Toujours autorisé
        if reveal_policy == "direct_if_asked":
            authorized_rows.append(row)
            continue

        # Extraction du topic requis (fonctionne pour direct_if_* et only_if_*)
        required_topic = _extract_topic_from_policy(reveal_policy)

        is_authorized = False
        if required_topic is not None and required_topic in all_explored_topics:
            is_authorized = True
                
        if is_authorized:
            authorized_rows.append(row)
        else:
            blocked_rows.append({
                "fact_id": fact_id,
                "reveal_policy": reveal_policy,
                "required_topic": required_topic,
                "explored_topics": list(all_explored_topics),
            })
            
    return authorized_rows, blocked_rows



def state_motor_datalog(global_asked_topics, current_target_slots, rows):
    """
    Filtre les informations du RAG en utilisant maelys-datalog (Inline Dynamic).
    
    Remplace state_motor_advanced avec un moteur formel Datalog.
    Retourne (authorized_rows, blocked_rows) — même interface.
    
    Les règles sont STATIQUES. La classification des policies se fait via des
    prédicats EDB (is_always, is_direct, is_only) — pas de string literals
    dans les règles Datalog.
    
    Distinction par rapport à state_motor_advanced :
    - direct_if_<topic> : autorisé si le topic est exploré globalement
    - only_if_<topic>   : autorisé si le topic est exploré ET dans les target_slots courants
    """
    

    ruleset = get_ruleset()

    # recup tous les topics explorés
    all_explored_topics = set()
    for topic_group in global_asked_topics:
        if isinstance(topic_group, list):
            for topic in topic_group:
                all_explored_topics.add(topic)
        else:
            all_explored_topics.add(topic_group)
    for slot in current_target_slots:
        all_explored_topics.add(slot)

    # recup les infos de chaque row
    fact_rows = []  # (fact_id, policy, row_index, is_reference)

    for i, row in enumerate(rows):
        source_type = row.get("source_type", "unknown")
        
        if source_type == "reference":
            fact_rows.append((f"ref_{i}", None, i, True))
            continue
        
        policy = row.get("metadata", {}).get("reveal_policy", "unknown")
        fact_id = row.get("metadata", {}).get("fact_id", f"unknown_{i}")
        fact_rows.append((fact_id, policy, i, False))

    # creer l'edb et ajouter les faits
    edb = ruleset.edb()
    
    for topic in all_explored_topics:
        edb.add_fact('explored', [topic])
    
    for slot in current_target_slots:
        edb.add_fact('current_slot', [slot])
    
    for fact_id, policy, row_idx, is_ref in fact_rows:
        if is_ref:
            edb.add_fact('is_reference', [fact_id])
        else:
            edb.add_fact('has_policy', [fact_id, policy])
            
            # Classifier la policy en EDB
            if policy == "direct_if_asked":
                edb.add_fact('is_always', [policy])
            else:
                topic = _extract_topic_from_policy(policy)
                if topic is not None:
                    if policy.startswith("direct_if_"):
                        edb.add_fact('is_direct', [policy, topic])
                    elif policy.startswith("only_if_"):
                        edb.add_fact('is_only', [policy, topic])
    
    result = ruleset.solve(edb)
    
    # recup les faits autorisés et bloqués
    allowed_facts = set()
    for row in result.enumerate_predicate_facts('allow', 1):
        allowed_facts.add(row[0])
    
    blocked_fact_ids = set()
    for row in result.enumerate_predicate_facts('blocked', 1):
        blocked_fact_ids.add(row[0])
    
    # faire les listes de sortie
    authorized_rows = []
    blocked_rows = []
    
    for fact_id, policy, row_idx, is_ref in fact_rows:
        if fact_id in allowed_facts:
            explanation = result.explain_fact_text('allow', [fact_id])
            row = rows[row_idx]
            if "metadata" not in row or row["metadata"] is None:
                row["metadata"] = {}
            row["metadata"]["datalog_explanation"] = explanation
            authorized_rows.append(row)
        else:
            explanation = result.explain_fact_text('blocked', [fact_id])
            required_topic = _extract_topic_from_policy(policy) if policy else None
            blocked_rows.append({
                "fact_id": fact_id,
                "reveal_policy": policy or "reference",
                "required_topic": required_topic,
                "explored_topics": list(all_explored_topics),
                "datalog_explanation": explanation,
            })
    
    return authorized_rows, blocked_rows