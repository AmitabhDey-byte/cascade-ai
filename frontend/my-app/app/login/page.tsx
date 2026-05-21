"use client";
import Link from "next/link";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1800);
  };

  return (
    <div className="relative min-h-screen bg-transparent font-['Orbitron'] text-white flex items-center justify-center overflow-hidden">
      {/* Grid background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,255,140,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,140,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />
      {/* Glow center */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(0,255,140,0.05) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 w-full max-w-sm px-6">
        {/* Logo */}
        <div className="mb-10 text-center">
          <Link href="/">
            <h1 className="text-2xl font-black tracking-[0.3em]">
              CASCADE<span className="text-emerald-400">AI</span>
            </h1>
          </Link>
          <p className="mt-2 text-[9px] tracking-[0.4em] text-white/30">CLIMATE INTELLIGENCE SYSTEM</p>
        </div>

        {/* Card */}
        <div className="glass-panel rounded-2xl p-8">
          <div className="mb-6">
            <h2 className="text-xs font-bold tracking-[0.3em] text-white">SECURE ACCESS</h2>
            <p className="mt-1 text-[9px] tracking-[0.2em] text-white/30">RANGER INTELLIGENCE PORTAL</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[9px] tracking-[0.25em] text-white/40">
                IDENTIFIER
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ranger@cascadeai.io"
                className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-xs tracking-widest text-white placeholder-white/20 outline-none transition focus:border-emerald-400/40 focus:bg-white/[0.05]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[9px] tracking-[0.25em] text-white/40">
                ACCESS KEY
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-xs tracking-widest text-white placeholder-white/20 outline-none transition focus:border-emerald-400/40 focus:bg-white/[0.05]"
              />
            </div>

            <Link href="/dashboard">
              <button
                onClick={handleLogin}
                disabled={loading}
                className="mt-2 w-full rounded-lg border border-emerald-400/30 bg-emerald-400/10 py-3 text-[10px] font-bold tracking-[0.3em] text-emerald-400 transition hover:bg-emerald-400/20 hover:border-emerald-400/50 disabled:opacity-50"
              >
                {loading ? "AUTHENTICATING..." : "AUTHENTICATE"}
              </button>
            </Link>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-[8px] tracking-[0.2em] text-white/20">ENCRYPTED CHANNEL</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          <div className="mt-4 text-center">
            <p className="text-[9px] tracking-[0.15em] text-white/20">
              AUTHORIZED PERSONNEL ONLY · AES-256
            </p>
          </div>
        </div>

        {/* Data sources footer */}
        <div className="mt-8 flex justify-center gap-4">
          {["NASA", "NOAA", "GBIF", "IUCN"].map((s) => (
            <span key={s} className="text-[8px] tracking-[0.25em] text-white/20">{s}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
