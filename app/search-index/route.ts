import { buildAllSearchIndex } from "@/content/index";
import { NextResponse } from "next/server";

/** 静态生成搜索索引 JSON（CDN 可缓存） */
export const dynamic = "force-static";

export async function GET() {
  const index = buildAllSearchIndex();
  return NextResponse.json(index, {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
