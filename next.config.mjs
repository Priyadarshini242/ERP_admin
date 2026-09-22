import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

/** @type {import('next').NextConfig} */
export default function nextConfig(phase) {
  return {
    reactStrictMode: true,
    // `next build` previously replaced files used by an already-running dev
    // server, including app/layout.css. Keep their generated artifacts apart.
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
    experimental: {
      // Reduces the amount Next needs to process when a screen imports icons.
      optimizePackageImports: ["lucide-react"],
    },
  };
}
