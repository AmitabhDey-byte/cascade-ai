from retriever import retrieve_context

from memory import (
    get_recent_memory,
    save_message
)

from llm import generate_response

from neo4j_context import (
    get_species_relationships
)

# =========================
# MAIN PIPELINE
# =========================

def ecology_chat(
    session_id,
    user_query,
    species_name="Fishing Cat"
):

    # =====================
    # MEMORY
    # =====================

    memory = get_recent_memory(
        session_id
    )

    memory_text = ""

    for msg in memory:

        memory_text += (
            f"{msg['role']}: "
            f"{msg['content']}\n"
        )

    # =====================
    # RAG RETRIEVAL
    # =====================

    rag_query = f"""

    {species_name}
    flood vulnerability
    habitat threats
    conservation strategies

    """

    context_chunks = retrieve_context(
        rag_query
    )

    context = "\n\n".join(
        context_chunks
    )

    # =====================
    # NEO4J CONTEXT
    # =====================

    relationships = (
        get_species_relationships(
            species_name
        )
    )

    relationship_text = ""

    for rel in relationships:

        relationship_text += (

            f"{species_name} "

            f"{rel['relationship']} "

            f"{rel['target']}\n"
        )

    # =====================
    # FINAL PROMPT
    # =====================

    prompt = f"""

    You are CascadeAI,
    an ecological disaster
    intelligence assistant.

    =========================
    CONVERSATION HISTORY
    =========================

    {memory_text}

    =========================
    ECOLOGICAL CONTEXT
    =========================

    {context}

    =========================
    SPECIES RELATIONSHIPS
    =========================

    {relationship_text}

    =========================
    USER QUESTION
    =========================

    {user_query}

    =========================
    RESPONSE
    =========================

    """

    # =====================
    # GENERATE
    # =====================

    response = generate_response(
        prompt
    )

    # =====================
    # SAVE MEMORY
    # =====================

    save_message(
        session_id,
        "user",
        user_query
    )

    save_message(
        session_id,
        "assistant",
        response
    )

    return response