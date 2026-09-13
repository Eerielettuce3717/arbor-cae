import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoName = "arbor-cae";
const githubPages = process.env.GITHUB_PAGES === "true";
const basePath = githubPages ? `/${repoName}` : "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  productionBrowserSourceMaps: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  images: { unoptimized: true },
  basePath,
  assetPrefix: basePath || undefined,
  turbopack: {
    root: path.dirname(fileURLToPath(import.meta.url)),
  },
  webpack: (config, { dev }) => {
    if (!dev) {
      config.devtool = false;
    }
    return config;
  },
};

export default nextConfig;
