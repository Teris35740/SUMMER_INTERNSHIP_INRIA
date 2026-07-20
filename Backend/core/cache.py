from datetime import datetime, timezone

cache = {}

def add_message(session_id, role, content):
    cache.setdefault(session_id, []).append({
        "session_id": session_id,
        "role": role,
        "content": content,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

def get_history(session_id):
    return cache.get(session_id, [])

def clear_session(session_id):
    cache.pop(session_id, None)