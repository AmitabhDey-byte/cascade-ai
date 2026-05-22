import { useEffect, useState, useCallback } from "react";
import { getSpeciesForTile, getHighRiskSpecies } from "@/lib/api";
import type { SpeciesAlert } from "@/types";

interface UseSpeciesDataReturn {
  species:      SpeciesAlert[];
  loading:      boolean;
  error:        string | null;
  priorityCount: number;
}

/** Fetches species for a specific tile when tileId changes */
export function useSpeciesData(tileId: string | null): UseSpeciesDataReturn {
  const [species, setSpecies]   = useState<SpeciesAlert[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    if (!tileId) {
      return;
    }

    const id = window.setTimeout(() => {
      setLoading(true);
      setError(null);

      getSpeciesForTile(tileId)
        .then((data) => setSpecies(data))
        .catch(() => setError("Failed to fetch species data."))
        .finally(() => setLoading(false));
    }, 0);

    return () => window.clearTimeout(id);
  }, [tileId]);

  return {
    species: tileId ? species : [],
    loading,
    error,
    priorityCount: (tileId ? species : []).filter((s) => s.is_priority).length,
  };
}

/** Fetches all priority species across all high-risk tiles */
export function useHighRiskSpecies(pollIntervalMs = 60000): UseSpeciesDataReturn {
  const [species, setSpecies]   = useState<SpeciesAlert[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const fetchSpecies = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getHighRiskSpecies();
      setSpecies(data);
    } catch {
      setError("Failed to fetch high-risk species.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => void fetchSpecies(), 0);
    return () => window.clearTimeout(id);
  }, [fetchSpecies]);

  useEffect(() => {
    const interval = setInterval(fetchSpecies, pollIntervalMs);
    return () => clearInterval(interval);
  }, [fetchSpecies, pollIntervalMs]);

  useEffect(() => {
    const handleUpdate = () => void fetchSpecies();
    window.addEventListener("cascadeai-pipeline-updated", handleUpdate);
    return () => window.removeEventListener("cascadeai-pipeline-updated", handleUpdate);
  }, [fetchSpecies]);

  return {
    species,
    loading,
    error,
    priorityCount: species.filter((s) => s.is_priority).length,
  };
}
