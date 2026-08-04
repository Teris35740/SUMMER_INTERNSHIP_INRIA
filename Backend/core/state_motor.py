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