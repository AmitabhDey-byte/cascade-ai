"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "RISK MAP",    icon: "⬡" },
  { href: "/species",   label: "SPECIES",     icon: "◈" },
  { href: "/report",    label: "REPORTS",     icon: "◉" },
  { href: "/blockchain",label: "BLOCKCHAIN",  icon: "◆" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-16 flex flex-col items-center py-6 gap-8 border-r border-white/[0.05] bg-black/40 z-50">
      {/* Logo */}
      <div className="text-emerald-400 text-lg font-black">⬡</div>

      {/* Nav */}
      <nav className="flex flex-col items-center gap-4 flex-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`w-10 h-10 flex items-center justify-center rounded-lg text-base transition ${
                isActive
                  ? "bg-emerald-400/15 text-emerald-400"
                  : "text-white/20 hover:text-white/60 hover:bg-white/5"
              }`}
            >
              {item.icon}
            </Link>
          );
        })}
      </nav>

      {/* Version */}
      <div className="text-[7px] text-white/10 tracking-widest rotate-90">v1.0</div>
    </aside>
  );
}