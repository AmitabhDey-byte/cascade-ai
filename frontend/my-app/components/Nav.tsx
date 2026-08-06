"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import AlertBadge from "@/components/ui/AlertBadge";
import { useRiskData } from "@/hooks/userRiskData";

const LINKS = [
  { href: "/dashboard", label: "DASHBOARD" },
  { href: "/risk-map", label: "RISK MAP" },
  { href: "/species", label: "SPECIES" },
  { href: "/reports", label: "REPORTS" },
];

export default function Nav() {
  const pathname = usePathname();
  const { highRiskCount } = useRiskData();

  return (
    <nav className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#030807]/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-400/30 bg-emerald-400/10 text-sm font-black text-emerald-300">C</span>
          <span className="min-w-0">
            <span className="block text-xs font-black tracking-[0.22em] text-white">CASCADE<span className="text-emerald-400">AI</span></span>
            <span className="block truncate text-[7px] tracking-[0.18em] text-white/35">EASTERN INDIA OPERATIONS</span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link key={link.href} href={link.href} className={`rounded-md px-3 py-2 text-[9px] tracking-[0.16em] transition ${active ? "bg-emerald-400/12 text-emerald-300" : "text-white/40 hover:bg-white/5 hover:text-white/80"}`}>
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <AlertBadge count={highRiskCount} />
          <span className="flex items-center gap-2 text-[8px] tracking-[0.18em] text-white/35"><i className="h-1.5 w-1.5 rounded-full bg-emerald-400" /><span className="hidden sm:inline">LIVE</span></span>
        </div>
      </div>
    </nav>
  );
}
