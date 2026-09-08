import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["mariadb", "@prisma/adapter-mariadb"]
};

export default nextConfig;
