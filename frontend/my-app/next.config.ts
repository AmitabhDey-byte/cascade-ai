import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  turbopack: {
    root: __dirname,
  },
  // Avoid child-process spawning during the build type check. This is more
  // reliable on Windows and behaves the same in Vercel's build environment.
  experimental: {
    workerThreads: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.mapbox.com",
        pathname: "/styles/v1/**",
      },
    ],
  },
};

export default nextConfig;
