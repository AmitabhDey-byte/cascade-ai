"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json() as { detail?: string };
      if (!response.ok) throw new Error(data.detail ?? "Unable to sign in.");
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-transparent font-['Orbitron'] text-white">
      <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(0,255,140,0.03) 1px, transparent 1px),linear-gradient(90deg, rgba(0,255,140,0.03) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(0,255,140,0.05) 0%, transparent 70%)" }} />

      <div className="relative z-10 w-full max-w-sm px-6">
        <div className="mb-10 text-center">
          <Link href="/"><h1 className="text-2xl font-black tracking-[0.3em]">CASCADE<span className="text-emerald-400">AI</span></h1></Link>
          <p className="mt-2 text-[9px] tracking-[0.4em] text-white/30">CLIMATE INTELLIGENCE SYSTEM</p>
        </div>

        <div className="glass-panel rounded-2xl p-8">
          <div className="mb-6"><h2 className="text-xs font-bold tracking-[0.3em] text-white">ACCESS PORTAL</h2><p className="mt-1 text-[9px] tracking-[0.2em] text-white/30">RANGER INTELLIGENCE PORTAL</p></div>
          <form onSubmit={handleLogin} className="space-y-4">
            <label className="block"><span className="mb-1.5 block text-[9px] tracking-[0.25em] text-white/40">IDENTIFIER</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ranger@cascadeai.io" className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-xs tracking-widest text-white placeholder-white/20 outline-none transition focus:border-emerald-400/40" /></label>
            <label className="block"><span className="mb-1.5 block text-[9px] tracking-[0.25em] text-white/40">ACCESS KEY</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••••••" className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-xs tracking-widest text-white placeholder-white/20 outline-none transition focus:border-emerald-400/40" /></label>
            <button type="submit" disabled={submitting} className="mt-2 w-full rounded-lg border border-emerald-400/30 bg-emerald-400/10 py-3 text-[10px] font-bold tracking-[0.3em] text-emerald-400 transition hover:bg-emerald-400/20 disabled:cursor-wait disabled:opacity-60">{submitting ? "SIGNING IN…" : "SIGN IN"}</button>
          </form>
          {message && <p className="mt-4 text-[9px] leading-relaxed tracking-[0.1em] text-red-200/90">{message}</p>}
          {process.env.NODE_ENV !== "production" && <p className="mt-6 text-center text-[8px] tracking-[0.15em] text-white/20">LOCAL MODE: ANY NON-EMPTY CREDENTIALS WORK UNTIL YOU CONFIGURE AUTH</p>}
        </div>
      </div>
    </div>
  );
}
