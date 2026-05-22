import { useEffect, useState, useCallback } from "react";
import { getHighRiskSpecies } from "@/lib/api";
import type { SpeciesAlert } from "@/types";

interface UseDashboardSpeciesReturn {
  species: SpeciesAlert[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

/**
 * Hook that fetches high-risk species across all tiles
 * Useful for dashboard-wide views (doesn't need specific tile ID)
 */
export function useDashboardSpecies(pollIntervalMs = 60000): UseDashboardSpeciesReturn {
  const [species, setSpecies] = useState<SpeciesAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchSpecies = useCallback(async () => {
    try {
      const data = await getHighRiskSpecies();
      setSpecies(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch species data");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    const id = window.setTimeout(() => void fetchSpecies(), 0);
    return () => window.clearTimeout(id);
  }, [fetchSpecies]);

  // Poll every interval
  useEffect(() => {
    const interval = setInterval(fetchSpecies, pollIntervalMs);
    return () => clearInterval(interval);
  }, [fetchSpecies, pollIntervalMs]);

  // Refresh species immediately after the pipeline finishes
  useEffect(() => {
    const handleUpdate = () => void fetchSpecies();
    window.addEventListener("cascadeai-pipeline-updated", handleUpdate);
    return () => window.removeEventListener("cascadeai-pipeline-updated", handleUpdate);
  }, [fetchSpecies]);

  return {
    species,
    loading,
    error,
    lastUpdated,
    refresh: fetchSpecies,
  };
}
