from datetime import datetime, timezone

cache = {}

def init_session(session_id, patient_attitude):
    if patient_attitude is None:
        patient_attitude = {
            "anxiety": 0.5,
            "precision": 0.5,
            "cooperativeness": 0.8
        }
    if session_id not in cache:
        cache[session_id] = {
            "messages": [],
            "state": {
                "revealed_facts": [],
                "asked_topics": [],
                "patient_attitude": patient_attitude,
                "exam_results_unlocked": False
            }
        }

def add_asked_topic(session_id, topic):
    if session_id in cache:
        cache[session_id]["state"]["asked_topics"].append(topic)

def add_revealed_fact(session_id, fact_id):
    if session_id in cache:
        cache[session_id]["state"]["revealed_facts"].append(fact_id)


def add_message(session_id, role, content):
    if session_id not in cache:
        init_session(session_id, None)

    cache[session_id]["messages"].append({
        "session_id": session_id,
        "role": role,
        "content": content,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

def get_history(session_id):
    session = cache.get(session_id, {})
    return session.get("messages", [])

def get_clinical_state(session_id):
    session = cache.get(session_id, {})
    return session.get("state", {})

def clear_session(session_id):
    cache.pop(session_id, None)