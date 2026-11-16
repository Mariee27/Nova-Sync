import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The app is client-state heavy (demo mode persists to localStorage), so we
  // opt out of Cache Components / Activity-based route preservation.
  cacheComponents: false,
  reactStrictMode: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
