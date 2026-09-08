import type { MetadataRoute } from "next";

// 静态导出（output: "export"）要求元数据路由构建期生成
export const dynamic = "force-static";

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
