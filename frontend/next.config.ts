import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // View Transitions API を有効化 (Chrome/Edge/Safari 対応、Firefox は degradation)
  experimental: {
    viewTransition: true,
  },
};

export default nextConfig;
