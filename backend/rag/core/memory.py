_messages: list[dict[str, str]] = []


def save_message(session_id, role, content):
    _messages.append(
        {
            "session_id": session_id,
            "role": role,
            "content": content,
        }
    )


def get_recent_memory(session_id, limit=5):
    messages = [message for message in _messages if message["session_id"] == session_id]
    return messages[-limit:]
