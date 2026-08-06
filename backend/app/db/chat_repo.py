"""Durable chat history for the CascadeAI assistant."""

from app.db import neon


_local_sessions: dict[str, list[dict[str, str]]] = {}


async def append_message(session_id: str, role: str, content: str) -> None:
    if not neon.is_configured():
        _local_sessions.setdefault(session_id, []).append({"role": role, "content": content})
        _local_sessions[session_id] = _local_sessions[session_id][-100:]
        return
    await neon.execute(
        "INSERT INTO chat_messages (session_id, role, content) VALUES (%s, %s, %s)",
        (session_id, role, content),
    )


async def get_recent_messages(session_id: str, limit: int = 10) -> list[dict[str, str]]:
    if not neon.is_configured():
        return _local_sessions.get(session_id, [])[-limit:]
    rows = await neon.fetch_all(
        """
        SELECT role, content FROM (
          SELECT role, content, created_at FROM chat_messages
          WHERE session_id = %s ORDER BY created_at DESC, id DESC LIMIT %s
        ) recent ORDER BY created_at, role
        """,
        (session_id, limit),
    )
    return [{"role": str(row["role"]), "content": str(row["content"])} for row in rows]


async def get_session_messages(session_id: str) -> list[dict[str, str]]:
    if not neon.is_configured():
        return _local_sessions.get(session_id, [])
    rows = await neon.fetch_all(
        "SELECT role, content FROM chat_messages WHERE session_id = %s ORDER BY created_at, id",
        (session_id,),
    )
    return [{"role": str(row["role"]), "content": str(row["content"])} for row in rows]


async def clear_session(session_id: str) -> None:
    if not neon.is_configured():
        _local_sessions.pop(session_id, None)
        return
    await neon.execute("DELETE FROM chat_messages WHERE session_id = %s", (session_id,))
