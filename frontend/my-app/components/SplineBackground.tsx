"use client";

import Spline from "@splinetool/react-spline";

export default function SplineBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-[#06110d]">
      <div className="spline-atmosphere absolute inset-0">
        <Spline scene="https://prod.spline.design/gddUGkgCYhGTHkNZ/scene.splinecode" />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_72%_-6%,rgba(0,255,140,0.09)_0%,rgba(3,15,12,0.10)_38%,rgba(2,9,7,0.46)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_3px,rgba(0,255,140,0.012)_3px,rgba(0,255,140,0.012)_4px)]" />
    </div>
  );
}
