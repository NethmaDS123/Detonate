import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@detonate/engine"],
  allowedDevOrigins: ["127.0.0.1"],
  agentRules: false,
};

export default nextConfig;
