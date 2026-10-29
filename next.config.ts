import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Necesario para la imagen Docker de produccion (server.js autonomo).
  output: "standalone",
};

export default nextConfig;
