"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { label: "DASHBOARD", href: "/dashboard" },
  { label: "RISK MAP", href: "/risk-map" },
  { label: "SPECIES", href: "/species" },
  { label: "REPORTS", href: "/reports" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b border-white/[0.07] bg-black/60 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-60" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-[0.25em] text-white">
              CASCADE<span className="text-emerald-400">AI</span>
            </h1>
            <p className="text-[8px] tracking-[0.4em] text-white/30">CLIMATE INTELLIGENCE</p>
          </div>
        </Link>

        <div className="hidden items-center gap-8 text-[10px] tracking-[0.2em] md:flex">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.label}
                href={link.href}
                className={`relative group transition ${
                  active ? "text-emerald-400" : "text-white/50 hover:text-white/80"
                }`}
              >
                {link.label}
                <span
                  className={`absolute -bottom-1 left-0 h-px bg-emerald-400 transition-all ${
                    active ? "w-full" : "w-0 group-hover:w-full"
                  }`}
                />
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden text-[8px] tracking-[0.2em] text-white/30 md:block">
            LAST SYNC: 06:42 UTC
          </div>
          <Link
            href="/login"
            className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-[10px] tracking-[0.2em] text-white/60 transition hover:text-white hover:border-white/20"
          >
            LOGOUT
          </Link>
        </div>
      </div>
    </nav>
  );
}