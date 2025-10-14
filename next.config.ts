import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
    images: {
    domains: ["github.com"], // autorise les images du wiki
  },
};

export default nextConfig;
