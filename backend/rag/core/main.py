from fastapi import FastAPI

from pydantic import BaseModel

from pipeline import ecology_chat

app = FastAPI()

class ChatRequest(BaseModel):

    session_id: str

    question: str

    species_name: str = "Fishing Cat"

# =========================
# ROUTE
# =========================

@app.post("/chat")

def chat(request: ChatRequest):

    response = ecology_chat(

        session_id=request.session_id,

        user_query=request.question,

        species_name=request.species_name
    )

    return {
        "response": response
    }