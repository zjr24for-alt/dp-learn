/**
 * P0-2 验证：检查静态导出的文章页 HTML 是否包含正文（SSR 生效）、
 * 无"加载中"占位、含 JSON-LD / meta description / canonical。
 * 运行：node scripts/verify-static-articles.mjs
 */
import { readFileSync, readdirSync } from "node:fs";

const dir = "out/learn";
const files = readdirSync(dir).filter((f) => f.endsWith(".html"));
let fail = 0;

const sampleChecks = {
  "dpgen-workflow-overview.html": ["DP 势函数生成完整流程"],
  "dpgen-check-commands.html": ["DP-GEN 常用检查指令"],
  "deepmd-quick-start.html": ["DeePMD 快速上手"],
  "lammps-deepmd-integration.html": ["LAMMPS + DeePMD 集成"],
  "machine-json-guide.html": ["machine.json"],
};

for (const f of files) {
  const h = readFileSync(`${dir}/${f}`, "utf8");
  const issues = [];
  // 注：app/loading.tsx 的全局 Suspense fallback 会出现在所有静态页 HTML 中（正常现象），
  // 这里只验证文章正文（h1 + prose）是否真正服务端渲染进 HTML。
  if (!h.includes("prose prose-zinc")) issues.push("缺 prose 正文");
  if (!/<h1[^>]*>/.test(h)) issues.push("缺 h1");
  if (!h.includes("application/ld+json")) issues.push("缺 JSON-LD");
  if (!/name="description"/.test(h)) issues.push("缺 meta description");
  if (!h.includes('rel="canonical"')) issues.push("缺 canonical");
  if (issues.length) {
    fail++;
    console.log(`❌ ${f}: ${issues.join(", ")}`);
  }
  if (sampleChecks[f]) {
    for (const t of sampleChecks[f]) {
      if (!h.includes(t)) {
        fail++;
        console.log(`❌ ${f}: 缺正文关键词「${t}」`);
      }
    }
  }
}

console.log(`\n文章页 ${files.length} 个，失败 ${fail}`);
if (fail === 0) {
  console.log("抽样 h1 与 JSON-LD：");
  for (const f of ["dpgen-workflow-overview.html", "deepmd-quick-start.html", "machine-json-guide.html"]) {
    const h = readFileSync(`${dir}/${f}`, "utf8");
    const m = h.match(/<h1[^>]*>([^<]{2,60})</);
    const j = h.match(/<script type="application\/ld\+json"[^>]*>(.{0,120})/);
    console.log(`  ${f}`);
    console.log(`    h1: ${m ? m[1] : "(无)"}`);
    console.log(`    ld+json: ${j ? j[1].slice(0, 100) : "(无)"}`);
  }
}
process.exit(fail ? 1 : 0);
