import chromadb

from sentence_transformers import SentenceTransformer

# =========================
# MODEL
# =========================

model = SentenceTransformer(
    "all-MiniLM-L6-v2"
)

# =========================
# CHROMA
# =========================

client = chromadb.PersistentClient(
    path="rag/chroma_db"
)

collection = client.get_collection(
    name="ecology_docs"
)

# =========================
# RETRIEVE
# =========================

def retrieve_context(
    query: str,
    k: int = 4
):

    query_embedding = model.encode(
        query
    ).tolist()

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=k
    )

    return results["documents"][0]