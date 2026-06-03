// 服务端 Semantic Scholar API 代理
// GET /api/semantic-scholar?query=...&limit=...&offset=...&fields=...
// 注意：GitHub Pages 静态导出下此路由不可用，仅 dev/Vercel 部署生效

// 简易内存缓存
const cache = new Map<string, { data: string; ts: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 分钟

async function fetchWithRetry(url: string, retries = 1): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "dp-learn/0.2.0 (https://dp-learn.vercel.app)",
      },
      signal: AbortSignal.timeout(20_000),
    });

    if (res.status !== 429 || i === retries) return res;
    await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
  }
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
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=600, s-maxage=600",
        "X-Cache": "HIT",
      },
    });
  }

  const s2Url = new URL("https://api.semanticscholar.org/graph/v1/paper/search");
  searchParams.forEach((value, key) => {
    s2Url.searchParams.set(key, value);
  });

  try {
    const res = await fetchWithRetry(s2Url.toString());

    if (res.status === 429) {
      return new Response(
        JSON.stringify({ error: "Semantic Scholar 请求太频繁，请稍后再试" }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `Semantic Scholar 请求失败 (${res.status})` }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await res.text();

    // 写入缓存
    cache.set(cacheKey, { data, ts: Date.now() });
    if (cache.size > 100) {
      const now = Date.now();
      for (const [k, v] of cache) {
        if (now - v.ts > CACHE_TTL) cache.delete(k);
      }
    }

    return new Response(data, {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=600, s-maxage=600",
        "X-Cache": "MISS",
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: `S2 代理错误: ${err.message}` }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
