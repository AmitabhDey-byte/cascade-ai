"use client";

interface AlertBadgeProps {
  count: number;
}

export default function AlertBadge({ count }: AlertBadgeProps) {
  if (count === 0) return null;

  return (
    <div className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-400/30 bg-red-400/10">
      {/* Pulsing dot */}
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-400" />
      </span>
      <span className="text-[8px] font-bold tracking-[0.2em] text-red-400">
        {count} ACTIVE ALERT{count > 1 ? "S" : ""}
      </span>
    </div>
  );
}