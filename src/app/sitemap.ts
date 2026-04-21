import type { MetadataRoute } from "next";
import { getCanonicalOrigin } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getCanonicalOrigin();

  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily" },
    {
      url: `${baseUrl}/sections`,
      lastModified: new Date(),
      changeFrequency: "daily",
    },
    {
      url: `${baseUrl}/courses`,
      lastModified: new Date(),
      changeFrequency: "daily",
    },
    {
      url: `${baseUrl}/teachers`,
      lastModified: new Date(),
      changeFrequency: "daily",
    },
    {
      url: `${baseUrl}/bus-map`,
      lastModified: new Date(),
      changeFrequency: "weekly",
    },
    {
      url: `${baseUrl}/guides/markdown-support`,
      lastModified: new Date(),
      changeFrequency: "monthly",
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
    },
  ];
}
