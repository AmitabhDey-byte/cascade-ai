from pymongo import MongoClient

# =========================
# MONGO
# =========================

client = MongoClient(
    "mongodb://localhost:27017"
)

db = client["cascadeai"]

memory_collection = db["chat_memory"]

# =========================
# SAVE MESSAGE
# =========================

def save_message(
    session_id,
    role,
    content
):

    memory_collection.insert_one({

        "session_id": session_id,

        "role": role,

        "content": content
    })

# =========================
# GET MEMORY
# =========================

def get_recent_memory(
    session_id,
    limit=5
):

    messages = list(

        memory_collection.find({

            "session_id": session_id

        }).sort("_id", -1).limit(limit)

    )

    messages.reverse()

    return messages