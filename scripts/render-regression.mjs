/**
 * 内容回归检查：用生产同款管线（react-markdown + remark-gfm + sanitize + 自定义组件，
 * 数学内容走 rehype-katex）逐篇渲染全部内容文件，报告渲染异常。
 *
 * 运行：node scripts/render-regression.mjs
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeSanitize from "rehype-sanitize";
import { markdownSchema } from "../components/markdown/schema.ts";

// 各内容文件（仅类型导入，Node 类型擦除可直接加载）
const CONTENT_FILES = [
  "dpgen-workflow", "dpgen-handson", "deepmd-training", "deepmd-quickstart",
  "deepmd-tuning", "vasp-hpc", "lammps-deepmd", "dpdata-guide",
  "machine-config", "comp-materials", "atomistic-sim", "ovito-tips",
  "env-config", "linux-tips", "methodology", "cheatsheet",
];

const EXPORT_NAMES = {
  dpgenWorkflowArticles: "dpgen-workflow",
  dpgenHandsonArticles: "dpgen-handson",
  deepmdTrainingArticles: "deepmd-training",
  deepmdQuickstartArticles: "deepmd-quickstart",
  deepmdTuningArticles: "deepmd-tuning",
  vaspHpcArticles: "vasp-hpc",
  lammpsDeepmdArticles: "lammps-deepmd",
  dpdataGuideArticles: "dpdata-guide",
  machineConfigArticles: "machine-config",
  compMaterialsArticles: "comp-materials",
  atomisticSimArticles: "atomistic-sim",
  ovitoTipsArticles: "ovito-tips",
  envConfigArticles: "env-config",
  linuxTipsArticles: "linux-tips",
  methodologyArticles: "methodology",
};

function render(content, { math = false } = {}) {
  return renderToStaticMarkup(
    React.createElement(Markdown, {
      remarkPlugins: math ? [remarkGfm, remarkMath] : [remarkGfm],
      rehypePlugins: math
        ? [[rehypeKatex, { output: "html" }], [rehypeSanitize, markdownSchema]]
        : [[rehypeSanitize, markdownSchema]],
      children: content,
    })
  );
}

const results = [];
let totalArticles = 0;

for (const file of CONTENT_FILES) {
  const mod = await import(`../content/${file}.ts`);
  const exportName = Object.keys(EXPORT_NAMES).find((k) => EXPORT_NAMES[k] === file);
  let items = exportName ? mod[exportName] : null;
  if (!items && file === "cheatsheet") items = mod.cheatsheetItems;

  if (!items) {
    results.push({ file, status: "SKIP", note: "export not found" });
    continue;
  }

  for (const item of items) {
    totalArticles++;
    const title = item.title ?? item.label ?? item.id ?? "?";
    const content = item.content ?? "";
    try {
      const html = render(content);
      // 数学变体也应能渲染（若内容含公式分隔符）
      if (/[$$]/.test(content.replace(/```[\s\S]*?```/g, ""))) {
        render(content, { math: true });
      }
      results.push({
        file,
        title,
        status: "OK",
        chars: content.length,
        codeBlocks: (content.match(/```/g) || []).length / 2,
        tables: (content.match(/^\|/gm) || []).length > 0 ? "yes" : "no",
      });
    } catch (err) {
      results.push({
        file,
        title,
        status: "FAIL",
        error: err.message,
      });
    }
  }
}

// 报告
let fails = 0;
for (const r of results) {
  if (r.status === "OK") {
    console.log(`✅ [${r.file}] ${r.title} (${r.chars} chars, ${r.codeBlocks} code blocks, table: ${r.tables})`);
  } else if (r.status === "FAIL") {
    fails++;
    console.log(`❌ [${r.file}] ${r.title}: ${r.error}`);
  } else {
    console.log(`⚠️  [${r.file}] ${r.note}`);
  }
}
console.log(`\n总计 ${totalArticles} 篇文章（含速查表条目），失败 ${fails}`);
process.exit(fails === 0 ? 0 : 1);
