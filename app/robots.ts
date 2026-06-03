import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/progress"],
    },
    sitemap: "https://dp-learn.vercel.app/sitemap.xml",
  };
}
