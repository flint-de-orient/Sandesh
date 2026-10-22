import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Pin the project root so a stray lockfile in a parent folder isn't picked up.
  outputFileTracingRoot: __dirname,
  // Dev-only Next.js button: keep it clear of the sidebar footer.
  devIndicators: { position: "bottom-right" },
};

export default nextConfig;
