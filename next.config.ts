import { codeInspectorPlugin } from "code-inspector-plugin";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  /* config options here */
  // reactCompiler: true,
  turbopack: {
    rules: codeInspectorPlugin({
      bundler: "turbopack",
    }),
  },
};

export default withNextIntl(nextConfig);
