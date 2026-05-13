import bundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { loadEnv } from "./src/env";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  turbopack: {},
  allowedDevOrigins: ["127.0.0.1"],
  productionBrowserSourceMaps: false,
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-pg",
    "pg",
    "@aws-sdk/client-s3",
    "@aws-sdk/s3-request-presigner",
    "@modelcontextprotocol/sdk",
    "better-auth",
    "@better-auth/oauth-provider",
  ],
  experimental: {
    webpackMemoryOptimizations: true,
    serverSourceMaps: false,
    optimizePackageImports: ["lucide-react", "@base-ui/react"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  async rewrites() {
    // Avoid 308 /api/mcp/ → /api/mcp (clients often drop Authorization on redirect).
    return [{ source: "/api/mcp/", destination: "/api/mcp" }];
  },
};

export default function configureNextConfig(phase: string) {
  process.env.NEXT_PHASE = phase;
  loadEnv({ nextPhase: phase });
  return withNextIntl(withBundleAnalyzer(nextConfig));
}
