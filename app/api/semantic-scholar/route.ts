// 服务端 Semantic Scholar API 代理
// GET /api/semantic-scholar?query=...&limit=...&offset=...&fields=...
// 注意：GitHub Pages 静态导出下此路由不可用，仅 dev/Vercel 部署生效


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const s2Url = new URL("https://api.semanticscholar.org/graph/v1/paper/search");

  // 透传所有查询参数
  searchParams.forEach((value, key) => {
    s2Url.searchParams.set(key, value);
  });

  try {
    const res = await fetch(s2Url.toString(), {
      headers: {
        "User-Agent": "dp-learn/0.1 (mailto:dp-learn@example.com)",
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (res.status === 429) {
      return new Response(
        JSON.stringify({ error: "Semantic Scholar 请求太频繁，请稍后再试" }),
        {
          status: 429,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `Semantic Scholar 请求失败 (${res.status})` }),
        {
          status: 502,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const data = await res.json();

    return new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: `S2 proxy error: ${err.message}` }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
