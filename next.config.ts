import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Enable middleware rewrite support
  },
  images: {
    minimumCacheTTL: 86400,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.mux.com",
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com", // Example, adding common ones
      },
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/store/:handle*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      // The @handle -> /store/[handle] rewrite is handled in middleware.ts
      {
        source: "/sitemap.xml",
        destination: "/api/sitemap",
      },
    ];
  },
};

export default nextConfig;
