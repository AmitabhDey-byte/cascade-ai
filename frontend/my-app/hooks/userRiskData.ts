import { useEffect, useState, useCallback } from "react";
import { getRiskTiles, runPipeline } from "@/lib/api";
import type { RiskTile, PipelineResponse } from "@/types";

interface UseRiskDataReturn {
  tiles:        RiskTile[];
  loading:      boolean;
  error:        string | null;
  lastUpdated:  Date | null;
  highRiskCount: number;
  triggerPipeline: () => Promise<PipelineResponse | null>;
  refresh:      () => void;
}

export function useRiskData(pollIntervalMs = 30000): UseRiskDataReturn {
  const [tiles, setTiles]               = useState<RiskTile[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [lastUpdated, setLastUpdated]   = useState<Date | null>(null);

  const fetchTiles = useCallback(async () => {
    try {
      const data = await getRiskTiles();
      setTiles(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (e) {
      setError("Failed to fetch risk tiles. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchTiles();
  }, [fetchTiles]);

  // Poll every 30s
  useEffect(() => {
    const interval = setInterval(fetchTiles, pollIntervalMs);
    return () => clearInterval(interval);
  }, [fetchTiles, pollIntervalMs]);

  const triggerPipeline = useCallback(async (): Promise<PipelineResponse | null> => {
    try {
      setLoading(true);
      const result = await runPipeline();
      await fetchTiles(); // refresh after pipeline runs
      return result;
    } catch (e) {
      setError("Pipeline trigger failed.");
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchTiles]);

  return {
    tiles,
    loading,
    error,
    lastUpdated,
    highRiskCount: tiles.filter((t) => t.is_high_risk).length,
    triggerPipeline,
    refresh: fetchTiles,
  };
}