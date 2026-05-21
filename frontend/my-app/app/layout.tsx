import type { Metadata } from "next";
import SplineBackground from "@/components/SplineBackground";
import "./globals.css";

export const metadata: Metadata = {
  title: "CascadeAI — Climate Intelligence System",
  description: "Predict flood risks before ecosystems collapse. Powered by NASA SMAP, NOAA, GBIF, IUCN, and BioCLIP.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-black text-white antialiased">
        <SplineBackground />
        <div className="relative z-10 pointer-events-none">{children}</div>
      </body>
    </html>
  );
}
