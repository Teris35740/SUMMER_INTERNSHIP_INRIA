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
            
        is_authorized = False
        for slot in target_slots:
            if slot in reveal_policy:
                is_authorized = True
                break
                
        if is_authorized:
            authorized_rows.append(row)
            
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
        
        if reveal_policy == "direct_if_asked":
            authorized_rows.append(row)
            continue
            
        is_authorized = False
        required_topic = None
        if reveal_policy.startswith("only_if_"):
            required_topic = reveal_policy.replace("only_if_", "")
            if required_topic in all_explored_topics:
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