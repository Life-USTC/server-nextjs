import type { MetadataRoute } from "next";

const BASE_URL = "https://life-ustc.tiankaima.dev";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily" },
    {
      url: `${BASE_URL}/sections`,
      lastModified: new Date(),
      changeFrequency: "daily",
    },
    {
      url: `${BASE_URL}/courses`,
      lastModified: new Date(),
      changeFrequency: "daily",
    },
    {
      url: `${BASE_URL}/teachers`,
      lastModified: new Date(),
      changeFrequency: "daily",
    },
    {
      url: `${BASE_URL}/bus-schedule`,
      lastModified: new Date(),
      changeFrequency: "weekly",
    },
    {
      url: `${BASE_URL}/guides/markdown-support`,
      lastModified: new Date(),
      changeFrequency: "monthly",
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
    },
  ];
}
