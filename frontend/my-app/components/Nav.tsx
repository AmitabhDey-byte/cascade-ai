"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AlertBadge from "@/components/ui/AlertBadge";
import { useRiskData } from "@/hooks/userRiskData";

const LINKS = [
  { href: "/dashboard",  label: "DASHBOARD"  },
  { href: "/risk-map",   label: "RISK MAP"   },
  { href: "/species",    label: "SPECIES"    },
  { href: "/reports",    label: "REPORTS"    },
];

export default function Nav() {
  const pathname = usePathname();
  const { highRiskCount } = useRiskData();

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 border-b border-white/[0.05] bg-black/60 backdrop-blur-md">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-emerald-400/15 border border-emerald-400/30 flex items-center justify-center">
          <span className="text-emerald-400 text-sm">⬡</span>
        </div>
        <div>
          <div className="text-xs font-black tracking-[0.3em] text-white">CASCADE<span className="text-emerald-400">AI</span></div>
          <div className="text-[7px] tracking-[0.2em] text-white/20">SUNDARBANS INTELLIGENCE</div>
        </div>
      </div>

      {/* Links */}
      <div className="hidden md:flex items-center gap-1">
        {LINKS.map((l) => {
          const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`px-4 py-2 rounded-lg text-[9px] tracking-[0.2em] transition ${
                active
                  ? "bg-emerald-400/15 text-emerald-400"
                  : "text-white/30 hover:text-white/60 hover:bg-white/5"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <AlertBadge count={highRiskCount} />
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[8px] tracking-[0.2em] text-white/20">LIVE</span>
        </div>
      </div>
    </nav>
  );
}
