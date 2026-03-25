import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  turbopack: {},
  productionBrowserSourceMaps: false,
  experimental: {
    webpackMemoryOptimizations: true,
    serverSourceMaps: false,
  },
  async rewrites() {
    // Avoid 308 /api/mcp/ → /api/mcp (clients often drop Authorization on redirect).
    return [{ source: "/api/mcp/", destination: "/api/mcp" }];
  },
};

export default withNextIntl(nextConfig);
