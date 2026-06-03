import type { MetadataRoute } from "next";
import { allArticles } from "@/content/index";

const BASE = "https://dp-learn.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const articleRoutes: MetadataRoute.Sitemap = allArticles.map((a) => ({
    url: `${BASE}/learn/${a.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [
    { url: BASE, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE}/learn`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/cheatsheet`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/papers`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE}/qa`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/progress`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/contribute`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    ...articleRoutes,
  ];
}
