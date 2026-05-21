import logging
import httpx
import torch
from io import BytesIO
from PIL import Image
from typing import Dict, List, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

# Sundarbans target species — BioCLIP matches against these
# Format: "Common Name (Scientific Name)" gives BioCLIP more context
SUNDARBANS_LABELS = [
    "Royal Bengal Tiger (Panthera tigris tigris)",
    "Irrawaddy Dolphin (Orcaella brevirostris)",
    "Saltwater Crocodile (Crocodylus porosus)",
    "Ganges River Dolphin (Platanista gangetica)",
    "Fishing Cat (Prionailurus viverrinus)",
    "Smooth-coated Otter (Lutrogale perspicillata)",
    "Dusky Eagle Owl (Bubo coromandus)",
    "Brahminy Kite (Haliastur indus)",
    "Sambar Deer (Cervus unicolor)",
    "Wild Boar (Sus scrofa)",
    "Estuarine Crocodile (Crocodylus porosus)",
    "Indian Python (Python molurus)",
    "King Cobra (Ophiophagus hannah)",
    "Spotted Deer (Axis axis)",
    "Jungle Cat (Felis chaus)",
]

# Module-level cache — model loaded once at startup
_model      = None
_preprocess = None
_tokenizer  = None


def load_bioclip():
    """
    Loads BioCLIP from HuggingFace. ~400MB download on first run.
    Call this once at FastAPI startup.
    """
    global _model, _preprocess, _tokenizer

    try:
        import open_clip
        _model, _, _preprocess = open_clip.create_model_and_transforms(
            "hf-hub:imageomics/bioclip"
        )
        _tokenizer = open_clip.get_tokenizer("hf-hub:imageomics/bioclip")
        _model.eval()
        logger.info("BioCLIP model loaded successfully.")
    except Exception as e:
        logger.error(f"BioCLIP failed to load: {e}")
        raise


def verify_species(observations: List[Dict]) -> List[Dict]:
    """
    Runs BioCLIP on each observation photo.
    Returns only observations that pass the confidence threshold.

    Args:
        observations: cleaned list from gbif_processor.process_observations()

    Returns:
        List of verified observations with BioCLIP confidence scores.
    """
    global _model, _preprocess, _tokenizer
    if _model is None:
        load_bioclip()

    verified = []

    # Tokenise all labels once — same for every image
    text_tokens = _tokenizer(SUNDARBANS_LABELS)

    with torch.no_grad():
        text_features = _model.encode_text(text_tokens)
        text_features = text_features / text_features.norm(dim=-1, keepdim=True)

    for obs in observations:
        result = _run_inference(obs, text_features)
        if result:
            verified.append({**obs, **result})

    logger.info(f"BioCLIP verified {len(verified)}/{len(observations)} observations.")
    return verified


def _run_inference(obs: Dict, text_features: torch.Tensor) -> Optional[Dict]:
    """
    Runs BioCLIP on one observation photo.
    Returns None if confidence is below threshold or image fails to load.
    """
    global _model, _preprocess
    min_confidence = settings.BIOCLIP_CONFIDENCE_MIN

    image = _load_image(obs["photo_url"])
    if image is None:
        return None

    image_input = _preprocess(image).unsqueeze(0)

    with torch.no_grad():
        image_features = _model.encode_image(image_input)
        image_features = image_features / image_features.norm(dim=-1, keepdim=True)
        probs = (image_features @ text_features.T).softmax(dim=-1)

    best_idx    = probs[0].argmax().item()
    confidence  = probs[0][best_idx].item()

    if confidence < min_confidence:
        return None   # reject — not confident enough

    matched_label = SUNDARBANS_LABELS[best_idx]

    # Parse "Common Name (Scientific Name)" format
    if "(" in matched_label:
        common_name     = matched_label.split("(")[0].strip()
        scientific_name = matched_label.split("(")[1].rstrip(")")
    else:
        common_name     = matched_label
        scientific_name = matched_label

    return {
        "verified_species":     common_name,
        "verified_scientific":  scientific_name,
        "confidence_score":     round(confidence, 4),
        "bioclip_verified":     True,
    }


def _load_image(url: str) -> Optional[Image.Image]:
    """Downloads and opens an image from a URL. Returns None on failure."""
    try:
        resp = httpx.get(url, timeout=10, follow_redirects=True)
        resp.raise_for_status()
        return Image.open(BytesIO(resp.content)).convert("RGB")
    except Exception as e:
        logger.warning(f"Failed to load image from {url}: {e}")
        return None