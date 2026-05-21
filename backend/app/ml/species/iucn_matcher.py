from typing import Dict, List, Optional

# Pre-loaded IUCN data for Sundarbans species
# CR = Critically Endangered, EN = Endangered, VU = Vulnerable
# NT = Near Threatened, LC = Least Concern
# Expand this dict with your full IUCN API download

IUCN_DATA: Dict[str, Dict] = {
    "Panthera tigris tigris": {
        "status":           "EN",
        "population_trend": "Increasing",
        "habitat":          "Mangrove forests, grasslands, riverine areas",
        "threats":          "Habitat loss, poaching, human-wildlife conflict",
        "is_priority":      True,
        "iucn_id":          "15955",
    },
    "Orcaella brevirostris": {
        "status":           "EN",
        "population_trend": "Decreasing",
        "habitat":          "Coastal marine, estuarine, freshwater rivers",
        "threats":          "Bycatch, habitat degradation, boat strikes",
        "is_priority":      True,
        "iucn_id":          "15419",
    },
    "Crocodylus porosus": {
        "status":           "LC",
        "population_trend": "Stable",
        "habitat":          "Mangrove swamps, estuaries, coastal waters",
        "threats":          "Hunting, habitat loss",
        "is_priority":      False,
        "iucn_id":          "5668",
    },
    "Platanista gangetica": {
        "status":           "EN",
        "population_trend": "Decreasing",
        "habitat":          "Freshwater rivers, estuaries",
        "threats":          "Pollution, bycatch, dam construction",
        "is_priority":      True,
        "iucn_id":          "41758",
    },
    "Prionailurus viverrinus": {
        "status":           "VU",
        "population_trend": "Decreasing",
        "habitat":          "Wetlands, mangroves, reed beds near water",
        "threats":          "Wetland drainage, hunting, habitat loss",
        "is_priority":      True,
        "iucn_id":          "18148",
    },
    "Lutrogale perspicillata": {
        "status":           "VU",
        "population_trend": "Decreasing",
        "habitat":          "Rivers, lakes, estuaries, mangroves",
        "threats":          "Hunting, habitat loss, pollution",
        "is_priority":      True,
        "iucn_id":          "12427",
    },
    "Bubo coromandus": {
        "status":           "LC",
        "population_trend": "Stable",
        "habitat":          "Forests, mangroves, near water bodies",
        "threats":          "Deforestation",
        "is_priority":      False,
        "iucn_id":          "22689007",
    },
    "Haliastur indus": {
        "status":           "LC",
        "population_trend": "Stable",
        "habitat":          "Coasts, rivers, wetlands, mangroves",
        "threats":          "Habitat degradation",
        "is_priority":      False,
        "iucn_id":          "22695097",
    },
    "Cervus unicolor": {
        "status":           "VU",
        "population_trend": "Decreasing",
        "habitat":          "Forests, grasslands, mangrove edges",
        "threats":          "Hunting, habitat loss",
        "is_priority":      True,
        "iucn_id":          "41790",
    },
    "Ophiophagus hannah": {
        "status":           "VU",
        "population_trend": "Decreasing",
        "habitat":          "Dense forests, mangroves, near water",
        "threats":          "Persecution, habitat loss, collection for trade",
        "is_priority":      True,
        "iucn_id":          "177540",
    },
    "Python molurus": {
        "status":           "VU",
        "population_trend": "Decreasing",
        "habitat":          "Grasslands, forests, mangroves, near water",
        "threats":          "Hunting, habitat loss",
        "is_priority":      True,
        "iucn_id":          "183151",
    },
    "Sus scrofa": {
        "status":           "LC",
        "population_trend": "Stable",
        "habitat":          "Forests, shrublands, mangrove edges",
        "threats":          "Hunting",
        "is_priority":      False,
        "iucn_id":          "41775",
    },
    "Axis axis": {
        "status":           "LC",
        "population_trend": "Stable",
        "habitat":          "Forests, grasslands, mangrove edges",
        "threats":          "Hunting, habitat loss",
        "is_priority":      False,
        "iucn_id":          "41783",
    },
    "Felis chaus": {
        "status":           "LC",
        "population_trend": "Decreasing",
        "habitat":          "Wetlands, reed beds, mangroves",
        "threats":          "Wetland drainage, hunting",
        "is_priority":      False,
        "iucn_id":          "8540",
    },
}

# Fallback for unknown species
_DEFAULT = {
    "status":           "DD",   # Data Deficient
    "population_trend": "Unknown",
    "habitat":          "Unknown",
    "threats":          "Unknown",
    "is_priority":      False,
    "iucn_id":          None,
}

# Priority order for sorting in reports
STATUS_PRIORITY = {"CR": 0, "EN": 1, "VU": 2, "NT": 3, "LC": 4, "DD": 5}


def match_iucn_status(verified_observations: List[Dict]) -> List[Dict]:
    """
    Enriches verified BioCLIP observations with IUCN threat status.

    Args:
        verified_observations: list from bioclip.verify_species()

    Returns:
        Enriched list sorted by IUCN priority (CR first).
    """
    enriched = []

    for obs in verified_observations:
        scientific = obs.get("verified_scientific", obs.get("scientific_name", ""))
        iucn = _lookup(scientific)

        enriched.append({
            **obs,
            "iucn_status":      iucn["status"],
            "population_trend": iucn["population_trend"],
            "habitat":          iucn["habitat"],
            "known_threats":    iucn["threats"],
            "is_priority":      iucn["is_priority"],
            "iucn_id":          iucn["iucn_id"],
        })

    # Sort CR → EN → VU → NT → LC
    enriched.sort(key=lambda x: STATUS_PRIORITY.get(x.get("iucn_status", "DD"), 5))
    return enriched


def _lookup(scientific_name: str) -> Dict:
    """
    Looks up IUCN data by scientific name.
    Tries exact match first, then partial match on genus.
    """
    # Exact match
    if scientific_name in IUCN_DATA:
        return IUCN_DATA[scientific_name]

    # Genus-level match (e.g. "Panthera tigris" matches "Panthera tigris tigris")
    genus = scientific_name.split(" ")[0] if scientific_name else ""
    for key, val in IUCN_DATA.items():
        if key.startswith(genus):
            return val

    return _DEFAULT


def get_priority_species(enriched: List[Dict]) -> List[Dict]:
    """Returns only CR and EN species from an enriched list."""
    return [s for s in enriched if s.get("iucn_status") in ("CR", "EN")]