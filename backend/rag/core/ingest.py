import os
import uuid
import re
import fitz
import chromadb

from sentence_transformers import SentenceTransformer

# =========================
# EMBEDDING MODEL
# =========================

model = SentenceTransformer(
    "all-MiniLM-L6-v2"
)

# =========================
# CHROMADB CLIENT
# =========================

client = chromadb.PersistentClient(
    path="rag/chroma_db"
)

collection = client.get_or_create_collection(
    name="ecology_docs"
)

# =========================
# PDF DIRECTORY
# =========================

PDF_DIR = "data/pdfs"

# =========================
# CHUNK FUNCTION
# =========================

def chunk_text(
    text,
    chunk_size=500
):

    words = text.split()

    chunks = []

    for i in range(
        0,
        len(words),
        chunk_size
    ):

        chunk = " ".join(
            words[i:i + chunk_size]
        )

        chunks.append(chunk)

    return chunks

# =========================
# PROCESS PDFs
# =========================

for file in os.listdir(PDF_DIR):

    if not file.endswith(".pdf"):
        continue

    path = os.path.join(
        PDF_DIR,
        file
    )

    print(f"Processing: {file}")

    pdf = fitz.open(path)

    text = ""

    for page in pdf:
        text += page.get_text()

    # =====================
    # CLEAN TEXT
    # =====================

    text = re.sub(
        r'\\s+',
        ' ',
        text
    ).strip()

    # =====================
    # CHUNKING
    # =====================

    chunks = chunk_text(text)

    print(f"Chunks: {len(chunks)}")

    # =====================
    # EMBEDDINGS
    # =====================

    for chunk in chunks:

        if len(chunk) < 100:
            continue

        embedding = model.encode(
            chunk
        ).tolist()

        # =================
        # STORE
        # =================

        collection.add(

            ids=[str(uuid.uuid4())],

            documents=[chunk],

            embeddings=[embedding],

            metadatas=[{
                "source": file
            }]
        )

print("RAG ingestion complete")