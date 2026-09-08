/**
 * 首页 JS 包瘦身验证：检查首页加载的 JS chunks 是否含文章正文。
 * 运行：node scripts/verify-home-bundle.mjs
 */
import { readFileSync, existsSync } from "node:fs";

const home = readFileSync("out/index.html", "utf8");
const scripts = [...home.matchAll(/src="([^"]+\.js)"/g)].map((m) => m[1].replace("/dp-learn", ""));

let found = 0;
for (const s of scripts) {
  const p = `out${s}`;
  if (!existsSync(p)) continue;
  if (readFileSync(p, "utf8").includes("势函数生成完整流程")) {
    found++;
    console.log(`❌ 正文在首页 chunk: ${s}`);
  }
}
console.log(found === 0 ? "✅ HOME JS CLEAN：首页 JS 不含文章正文" : `${found} 个 chunk 含正文`);
console.log(`首页 HTML ${home.length} bytes（索引在 RSC payload 中）`);
process.exit(found ? 1 : 0);
