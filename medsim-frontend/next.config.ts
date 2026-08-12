import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["knickers-saline-geometry.ngrok-free.dev"],
  // Proxy all /api/* requests to the Python backend
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
