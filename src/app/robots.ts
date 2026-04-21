import type { MetadataRoute } from "next";
import { getCanonicalOrigin } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/settings/",
          "/signin/",
          "/oauth/",
          "/api/",
          "/welcome/",
        ],
      },
    ],
    sitemap: `${getCanonicalOrigin()}/sitemap.xml`,
  };
}
