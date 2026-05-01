import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "img.vietqr.io" },
    ],
  },
  experimental: {
    // CSRF defense for Server Actions — only accept actions from these origins.
    // Reject any forwarded request from a different host.
    serverActions: {
      allowedOrigins: ["focus.camp", "www.focus.camp", "localhost:3000"],
    },
  },
};

export default nextConfig;
