import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Enable middleware rewrite support
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  async rewrites() {
    return [
      // The <at>handle → /store/[handle] rewrite is handled in middleware.ts
      // These are additional SEO-friendly rewrites
      {
        source: "/sitemap.xml",
        destination: "/api/sitemap",
      },
    ];
  },
};

export default nextConfig;