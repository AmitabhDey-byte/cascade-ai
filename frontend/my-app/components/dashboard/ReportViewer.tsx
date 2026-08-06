"use client";

import { useEffect, useMemo, useState } from "react";
import type { RiskTile } from "@/types";
import { useReport } from "@/hooks/userReport";

type ReportViewerProps = {
  tiles: RiskTile[];
};

export default function ReportViewer({ tiles }: ReportViewerProps) {
  const [expanded, setExpanded] = useState(true);
  const { report, refresh, generate, loading, generating, error } = useReport();
  const selectedTileIds = useMemo(
    () => tiles.filter((tile) => tile.is_high_risk).map((tile) => tile.tile_id),
    [tiles],
  );

  useEffect(() => {
    const handlePipelineUpdate = () => void refresh();
    window.addEventListener("cascadeai-pipeline-updated", handlePipelineUpdate);
    return () => window.removeEventListener("cascadeai-pipeline-updated", handlePipelineUpdate);
  }, [refresh]);

  return (
    <div className="ops-panel rounded-xl p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <h3 className="text-[10px] font-bold tracking-[0.22em] text-white/55">RESPONSE BRIEF</h3>
        </div>
        {report && (
          <button
            onClick={() => setExpanded((current) => !current)}
            className="text-[8px] tracking-[0.2em] text-white/25 transition hover:text-white/50"
          >
            {expanded ? "COLLAPSE" : "EXPAND"}
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-10 text-center text-[8px] tracking-[0.2em] text-white/25">LOADING LATEST REPORT</div>
      ) : report ? (
        <ReportDetails report={report} expanded={expanded} />
      ) : (
        <div className="rounded-xl border border-white/[0.08] bg-black/20 p-4">
          <p className="text-[9px] leading-relaxed tracking-[0.08em] text-white/50">
            No conservation report has been generated for the current forecast.
          </p>
          <button
            onClick={() => void generate(selectedTileIds)}
            disabled={generating || selectedTileIds.length === 0}
            className="mt-4 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2.5 text-[8px] tracking-[0.14em] text-emerald-200 transition hover:bg-emerald-400/18 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {generating ? "GENERATING…" : "GENERATE FROM HIGH-RISK AREAS"}
          </button>
          {selectedTileIds.length === 0 && (
            <p className="mt-3 text-[8px] leading-relaxed text-white/30">A report can be generated after risk data identifies at least one high-risk area.</p>
          )}
        </div>
      )}

      {error && <p className="mt-3 text-[8px] leading-relaxed text-red-300">{error}</p>}
    </div>
  );
}

function ReportDetails({ report, expanded }: { report: NonNullable<ReturnType<typeof useReport>["report"]>; expanded: boolean }) {
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-[9px] font-black tracking-[0.2em] text-white/70">{report.id}</span>
          <span className="ml-3 text-[7px] tracking-[0.1em] text-white/25">
            {new Date(report.generated_at).toUTCString().slice(5, 22).toUpperCase()} UTC
          </span>
        </div>
        <span className="rounded border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[7px] tracking-[0.1em] text-emerald-300">GENERATED</span>
      </div>

      {expanded && (
        <>
          <div className="mb-4 rounded-lg border border-emerald-400/15 bg-emerald-400/[0.03] p-4">
            <div className="mb-2 text-[7px] tracking-[0.25em] text-emerald-400/50">IMPACT SUMMARY</div>
            <p className="text-[9px] leading-relaxed tracking-[0.08em] text-white/60">{report.estimated_impact || report.risk_summary}</p>
          </div>

          <div>
            <div className="mb-2 text-[7px] tracking-[0.25em] text-white/30">ACTION PLAN</div>
            <div className="space-y-1.5">
              {report.action_plan.split("\n").filter(Boolean).map((action, index) => (
                <div key={`${index}-${action}`} className="flex gap-3 rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2.5">
                  <span className="shrink-0 pt-0.5 text-[7px] font-black text-white/20">{String(index + 1).padStart(2, "0")}</span>
                  <span className="text-[8px] leading-relaxed tracking-[0.08em] text-white/55">{action}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
