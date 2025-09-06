import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    dirs: ["src"],
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  images: {
    domains: ["localhost"],
  },
  // Configure for Vercel deployment
  output: "standalone",
};

export default nextConfig;
