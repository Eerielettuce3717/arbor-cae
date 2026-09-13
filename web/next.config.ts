import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoName = "cad_engine";
const githubPages = process.env.GITHUB_PAGES === "true";
const basePath = githubPages ? `/${repoName}` : "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath,
  assetPrefix: basePath || undefined,
  turbopack: {
    root: path.dirname(fileURLToPath(import.meta.url)),
  },
};

export default nextConfig;
