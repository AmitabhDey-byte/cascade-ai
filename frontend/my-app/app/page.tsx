"use client";
import Link from "next/link";
import Spline from "@splinetool/react-spline";
import { useEffect, useState } from "react";

const navLinks = [
  { label: "DASHBOARD", href: "/dashboard" },
  { label: "RISK MAP", href: "/risk-map" },
  { label: "SPECIES", href: "/species" },
  { label: "REPORTS", href: "/reports" },
];

const STATS = [
  { value: "72H", label: "FORECAST HORIZON" },
  { value: "847", label: "SPECIES MONITORED" },
  { value: "12H", label: "UPDATE CYCLE" },
  { value: "98.4%", label: "MODEL ACCURACY" },
];

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-black font-['Orbitron'] text-white">
      {/* Spline BG */}
      <div className="absolute inset-0 z-0 pointer-events-auto">
        <Spline scene="https://prod.spline.design/gddUGkgCYhGTHkNZ/scene.splinecode" />
      </div>

      {/* Scanline overlay */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,140,0.015) 2px, rgba(0,255,140,0.015) 4px)",
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)",
        }}
      />

      <div className="relative z-10 pointer-events-none">
        {/* NAV */}
        <nav className="sticky top-0 border-b border-white/10 bg-black/30 backdrop-blur-2xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <div className="pointer-events-auto flex items-center gap-4">
              {/* Pulse indicator */}
              <div className="relative">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-75" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-[0.25em] text-white">
                  CASCADE<span className="text-emerald-400">AI</span>
                </h1>
                <p className="text-[9px] tracking-[0.4em] text-white/40">
                  CLIMATE INTELLIGENCE SYSTEM
                </p>
              </div>
            </div>

            <div className="hidden items-center gap-8 text-xs tracking-[0.2em] text-white/60 md:flex pointer-events-auto">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="relative group transition hover:text-emerald-400"
                >
                  {link.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-px bg-emerald-400 transition-all group-hover:w-full" />
                </Link>
              ))}
            </div>

            <Link
              href="/login"
              className="pointer-events-auto rounded-lg border border-emerald-400/30 bg-emerald-400/5 px-5 py-2.5 text-xs tracking-[0.2em] text-emerald-400 backdrop-blur-xl transition hover:bg-emerald-400/10 hover:border-emerald-400/60"
            >
              LOGIN
            </Link>
          </div>
        </nav>

        {/* HERO */}
        <section className="mx-auto flex min-h-[calc(100vh-65px)] max-w-7xl flex-col justify-center px-6">
          <div className="max-w-3xl">
            {/* Status badge */}
            <div className="pointer-events-auto mb-6 inline-flex items-center gap-3 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-4 py-2 text-[10px] tracking-[0.25em] text-emerald-400 backdrop-blur-xl">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              SYSTEM ACTIVE · SUNDARBANS MONITORING
            </div>

            <h1
              className="text-5xl font-black leading-[1.05] tracking-[0.06em] text-white md:text-7xl"
              style={{ textShadow: "0 0 80px rgba(0,255,140,0.15)" }}
            >
              PREDICT FLOOD
              <br />
              RISKS{" "}
              <span className="text-emerald-400" style={{ textShadow: "0 0 40px rgba(0,255,140,0.4)" }}>
                BEFORE
              </span>
              <br />
              ECOSYSTEMS
              <br />
              COLLAPSE
            </h1>

            <p className="mt-6 max-w-xl text-xs leading-loose tracking-[0.15em] text-white/50 md:text-sm">
              CascadeAI fuses satellite soil moisture, precipitation forecasting,
              and species CV into a unified disaster intelligence command center
              — protecting biodiversity at the edge of climate collapse.
            </p>

            {/* CTA Buttons */}
            <div className="mt-8 flex flex-wrap gap-3 pointer-events-auto">
              <Link
                href="/risk-map"
                className="group relative overflow-hidden rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-7 py-3.5 text-xs tracking-[0.2em] text-emerald-400 backdrop-blur-xl transition hover:bg-emerald-400/20"
              >
                <span className="relative z-10">VIEW LIVE MAP</span>
              </Link>
              <Link
                href="/dashboard"
                className="rounded-xl border border-white/10 bg-white/[0.03] px-7 py-3.5 text-xs tracking-[0.2em] text-white/70 backdrop-blur-xl transition hover:bg-white/[0.07] hover:text-white"
              >
                OPEN DASHBOARD
              </Link>
            </div>

            {/* Data source badges */}
            <div className="mt-10 flex flex-wrap gap-2 pointer-events-auto">
              {["NASA SMAP", "NOAA", "GBIF", "IUCN", "IMD", "BioCLIP"].map((item) => (
                <div
                  key={item}
                  className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-[9px] tracking-[0.25em] text-white/50 backdrop-blur-xl"
                >
                  {item}
                </div>
              ))}
            </div>

            {/* Stats row */}
            <div className="mt-12 grid grid-cols-4 gap-px border border-white/5 rounded-xl overflow-hidden pointer-events-auto max-w-xl">
              {STATS.map((s) => (
                <div key={s.label} className="bg-white/[0.03] backdrop-blur-xl px-4 py-4 text-center">
                  <div className="text-lg font-black tracking-widest text-emerald-400">{s.value}</div>
                  <div className="mt-1 text-[7px] tracking-[0.2em] text-white/30">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}