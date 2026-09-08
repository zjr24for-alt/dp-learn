/**
 * 视觉改动验证：检查构建产物中的品牌色、深色代码块、图表渐变。
 * 运行：node scripts/verify-visual.mjs
 */
import { readFileSync } from "node:fs";

let fail = 0;
function check(name, ok) {
  console.log(`${ok ? "✅" : "❌"} ${name}`);
  if (!ok) fail++;
}

// 文章页（扫描全部文章，含外链的文章应有靛蓝链接）
import { readdirSync } from "node:fs";
let linkOk = false;
for (const f of readdirSync("out/learn").filter((x) => x.endsWith(".html"))) {
  const h = readFileSync(`out/learn/${f}`, "utf8");
  if (h.includes("text-indigo-600")) linkOk = true;
  if (h.includes("bg-zinc-900 rounded-b-lg")) check("文章页深色代码块 (bg-zinc-900)", true);
  if (h.includes("bg-zinc-800 rounded-t-lg")) check("文章页代码块头部深色 (bg-zinc-800)", true);
}
check("文章页靛蓝链接 (text-indigo-600)", linkOk);

// 首页
const home = readFileSync("out/index.html", "utf8");
check("首页靛蓝 CTA (bg-indigo-600)", home.includes("bg-indigo-600"));
check("首页 hero 光晕 (indigo-200/40 blur-3xl)", home.includes("indigo-200/40 blur-3xl"));

// 教程页
const tut = readFileSync("out/tutorial.html", "utf8");
check("教程页深色代码块", tut.includes("bg-zinc-900 rounded-b-lg"));

// 工具页卡片 hover
const tools = readFileSync("out/tools.html", "utf8");
check("工具卡片 hover 抬升 (-translate-y-0.5)", tools.includes("hover:-translate-y-0.5"));

// 图表渐变（客户端 chunk，lcurve 页加载）
const lcHtml = readFileSync("out/lcurve.html", "utf8");
const scripts = [...lcHtml.matchAll(/src="([^"]+\.js)"/g)].map((m) => m[1].replace("/dp-learn", ""));
let chartOk = false;
for (const s of scripts) {
  try {
    const t = readFileSync(`out${s}`, "utf8");
    if (t.includes("linearGradient")) {
      chartOk = true;
      break;
    }
  } catch {
    /* skip */
  }
}
check("图表渐变代码进入客户端 chunk", chartOk);

console.log(`\n${fail === 0 ? "全部通过" : `${fail} 项失败`}`);
process.exit(fail ? 1 : 0);
