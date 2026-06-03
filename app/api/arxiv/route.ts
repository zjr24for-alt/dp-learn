// 服务端 arXiv API 代理 — 避免浏览器 CORS 限制
// GET /api/arxiv?search_query=...&start=...&max_results=...&sortBy=...&sortOrder=...
// 注意：GitHub Pages 静态导出下此路由不可用，仅 dev/Vercel 部署生效

// 简易内存缓存（减少对 arXiv 的重复请求）
const cache = new Map<string, { data: string; ts: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 分钟

async function fetchWithRetry(url: string, retries = 2): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "dp-learn/0.2.0 (https://dp-learn.vercel.app; mailto:dev@dp-learn.vercel.app)",
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (res.status !== 429 || i === retries) return res;

    // 指数退避：1s, 2s
    await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
  }
  // 不会到这里，但 TypeScript 需要
  throw new Error("Retry exhausted");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cacheKey = searchParams.toString();

  // 检查缓存
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return new Response(cached.data, {
      headers: {
        "Content-Type": "application/xml",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=600, s-maxage=600",
        "X-Cache": "HIT",
      },
    });
  }

  const arxivUrl = new URL("https://export.arxiv.org/api/query");
  searchParams.forEach((value, key) => {
    arxivUrl.searchParams.set(key, value);
  });

  try {
    const res = await fetchWithRetry(arxivUrl.toString());

    if (res.status === 429) {
      return new Response(
        JSON.stringify({ error: "arXiv API 请求太频繁，请稍后再试（已重试）" }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }
    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `arXiv 返回 ${res.status} ${res.statusText}` }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const xmlText = await res.text();

    // 写入缓存
    cache.set(cacheKey, { data: xmlText, ts: Date.now() });
    // 清理过期缓存（保留最近 100 条）
    if (cache.size > 100) {
      const now = Date.now();
      for (const [k, v] of cache) {
        if (now - v.ts > CACHE_TTL) cache.delete(k);
      }
    }

    return new Response(xmlText, {
      headers: {
        "Content-Type": "application/xml",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=600, s-maxage=600",
        "X-Cache": "MISS",
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: `arXiv 代理错误: ${err.message}` }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
