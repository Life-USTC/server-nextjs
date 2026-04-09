import type { MetadataRoute } from "next";

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
    sitemap: "https://life-ustc.tiankaima.dev/sitemap.xml",
  };
}
