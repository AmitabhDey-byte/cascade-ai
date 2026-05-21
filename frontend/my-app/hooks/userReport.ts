import { useEffect, useState, useCallback } from "react";
import { getLatestReport, generateReport } from "@/lib/api";
import type { ConservationReport } from "@/types";

interface UseReportReturn {
  report:           ConservationReport | null;
  loading:          boolean;
  generating:       boolean;
  error:            string | null;
  generate:         (tileIds: string[]) => Promise<void>;
  refresh:          () => void;
}

export function useReport(): UseReportReturn {
  const [report, setReport]         = useState<ConservationReport | null>(null);
  const [loading, setLoading]       = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const fetchLatest = useCallback(async () => {
    try {
      const data = await getLatestReport();
      setReport(data);
      setError(null);
    } catch {
      // 404 just means no report yet — not an error worth showing
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLatest();
  }, [fetchLatest]);

  const generate = useCallback(async (tileIds: string[]) => {
    if (!tileIds.length) return;
    setGenerating(true);
    setError(null);
    try {
      const data = await generateReport(tileIds);
      setReport(data);
    } catch {
      setError("Failed to generate report. Check Claude API key.");
    } finally {
      setGenerating(false);
    }
  }, []);

  return {
    report,
    loading,
    generating,
    error,
    generate,
    refresh: fetchLatest,
  };
}