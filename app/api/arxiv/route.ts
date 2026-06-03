// 服务端 arXiv API 代理 — 避免浏览器 CORS 限制
// GET /api/arxiv?search_query=...&start=...&max_results=...&sortBy=...&sortOrder=...
// 注意：GitHub Pages 静态导出下此路由不可用，仅 dev/Vercel 部署生效


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const arxivUrl = new URL("https://export.arxiv.org/api/query");

  // 透传所有查询参数
  searchParams.forEach((value, key) => {
    arxivUrl.searchParams.set(key, value);
  });

  try {
    const res = await fetch(arxivUrl.toString(), {
      headers: {
        // arXiv 要求有意义的 User-Agent，否则可能被限流
        "User-Agent": "dp-learn/0.1.0 (https://github.com/JR17/dp-learn; mailto:dev@example.com)",
      },
      // arXiv 响应可能较慢（尤其从国内），给 30 秒
      signal: AbortSignal.timeout(30_000),
    });

    if (res.status === 429) {
      return new Response(
        "arXiv API rate limit reached. Please wait a moment and try again.",
        { status: 429 }
      );
    }
    if (!res.ok) {
      return new Response(
        `arXiv upstream returned ${res.status} ${res.statusText}`,
        { status: 502 }
      );
    }

    const xmlText = await res.text();

    return new Response(xmlText, {
      headers: {
        "Content-Type": "application/xml",
        "Access-Control-Allow-Origin": "*",
        // 缓存 5 分钟减少重复请求对 arXiv 的压力
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  } catch (err: any) {
    return new Response(
      `arXiv proxy error: ${err.message || "Unknown error"}`,
      { status: 502 }
    );
  }
}
