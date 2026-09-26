import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Let other devices on the home network load the dev server's scripts.
  allowedDevOrigins: ["192.168.*.*"],
};

export default nextConfig;
