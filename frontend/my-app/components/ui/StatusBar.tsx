"use client";
import { useEffect, useState } from "react";

interface StatusBarProps {
  loading:      boolean;
  lastUpdated:  Date | null;
  highRiskCount: number;
  error:        string | null;
}

export default function StatusBar({
  loading,
  lastUpdated,
  highRiskCount,
  error,
}: StatusBarProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const secondsSince = lastUpdated
    ? Math.floor((now.getTime() - lastUpdated.getTime()) / 1000)
    : null;

  return (
    <div className="flex items-center gap-6 px-6 py-2 border-b border-white/[0.05] bg-black/20 text-[8px] tracking-[0.2em]">

      {/* Pipeline status */}
      <div className="flex items-center gap-2">
        <div
          className={`w-1.5 h-1.5 rounded-full ${
            error   ? "bg-red-400" :
            loading ? "bg-amber-400 animate-pulse" :
                      "bg-emerald-400"
          }`}
        />
        <span className="text-white/30">
          {error ? "ERROR" : loading ? "RUNNING PIPELINE" : "PIPELINE IDLE"}
        </span>
      </div>

      {/* Last updated */}
      {secondsSince !== null && (
        <div className="text-white/20">
          UPDATED {secondsSince}S AGO
        </div>
      )}

      {/* High risk count */}
      {highRiskCount > 0 && (
        <div className="flex items-center gap-2 text-red-400">
          <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
          {highRiskCount} HIGH RISK {highRiskCount === 1 ? "AREA" : "AREAS"}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="text-red-400/70 ml-auto">{error}</div>
      )}
    </div>
  );
}
