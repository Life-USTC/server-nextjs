import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const dotEnvExpand = require("dotenv-expand");

dotEnvExpand.expand(require("dotenv").config());

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
};

export default withNextIntl(nextConfig);
