import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El Admin SDK usa binarios nativos de gRPC: no debe pasar por el bundler.
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
