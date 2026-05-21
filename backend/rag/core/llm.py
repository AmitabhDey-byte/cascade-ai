from transformers import pipeline

# =========================
# LOAD MODEL
# =========================

generator = pipeline(

    "text-generation",

    model="TinyLlama/TinyLlama-1.1B-Chat-v1.0",

    device_map="auto"
)

# =========================
# GENERATE RESPONSE
# =========================

def generate_response(prompt):

    result = generator(

        prompt,

        max_new_tokens=300,

        temperature=0.7,

        do_sample=True
    )

    return result[0]["generated_text"]