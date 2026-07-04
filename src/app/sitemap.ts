import type { MetadataRoute } from "next";
import { absoluteSiteUrl } from "@/lib/seo";
import { solutionPages } from "@/lib/marketing-content";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: absoluteSiteUrl("/"),
      lastModified,
      changeFrequency: "weekly",
      priority: 1
    },
    ...solutionPages.map((page) => ({
      url: absoluteSiteUrl(`/${page.slug}`),
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.86
    }))
  ];
}
