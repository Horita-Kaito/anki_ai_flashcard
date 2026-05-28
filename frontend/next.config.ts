import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["127.0.0.1"],
  async rewrites() {
    const apiBase = process.env.INTERNAL_API_URL ?? "http://backend:8000";

    return [
      {
        source: "/api/:path*",
        destination: `${apiBase}/api/:path*`,
      },
      {
        source: "/sanctum/csrf-cookie",
        destination: `${apiBase}/sanctum/csrf-cookie`,
      },
    ];
  },
  turbopack: {},
  experimental: {
    viewTransition: true,
  },
};

export default withPWA(nextConfig);
