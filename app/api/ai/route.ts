// 服务端 DeepSeek API 代理 — 避免浏览器 CORS 限制
// POST /api/ai  —  body + Authorization 透传到 api.deepseek.com
// 注意：GitHub Pages 静态导出下此路由不可用，仅 dev/Vercel 部署生效

export const dynamic = "force-static";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const authHeader = request.headers.get("Authorization");

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "未提供 API Key。请在对话框中点击「⚙️ 配置 API Key」设置。" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body,
      signal: AbortSignal.timeout(60_000),
    });

    const data = await res.json();

    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: `代理错误: ${err.message}` }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
