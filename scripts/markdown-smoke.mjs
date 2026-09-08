/**
 * 冒烟测试：验证 react-markdown + remark-gfm + remark-math + rehype-katex + rehype-sanitize
 * 组合输出（KaTeX 类名保留、XSS 拦截、代码块/表格/列表渲染）。
 * 运行：node scripts/markdown-smoke.mjs
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeSanitize from "rehype-sanitize";
import { defaultSchema } from "hast-util-sanitize";

// 扩展 schema：允许 className（KaTeX 依赖）、target/rel（外链新窗口）
const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    "*": [...defaultSchema.attributes["*"], "className", "style", "aria-hidden", "role"],
    a: [...defaultSchema.attributes.a, "target", "rel"],
  },
};

const SAMPLE = `# 一级标题

段落 **加粗** 与 \`inline code\`，还有 [外链](https://example.com)。

行内公式 $E = mc^2$，双美元行内 $$\\alpha + \\beta$$。

块级公式（围栏式）：

$$
\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}
$$

\`\`\`bash
echo $HOME $(date +%H:%M)
NP=$(wc -l < "$PBS_NODEFILE")
\`\`\`

无语言代码块：

\`\`\`
plain text here
\`\`\`

| 列A | 列B |
|-----|-----|
| 1   | **2** |

- 列表项
  - 嵌套项
- 另一项

> 引用内容

---

![图片](https://example.com/x.png)
`;

const XSS = `正常文本

<script>alert(1)</script>

<img src="x" onerror="alert(2)">

[危险链接](javascript:alert(3))

<a href="https://evil.com" onclick="alert(4)">原始html</a>
`;

function render(md, name) {
  const html = renderToStaticMarkup(
    React.createElement(Markdown, {
      remarkPlugins: [remarkGfm, remarkMath],
      rehypePlugins: [[rehypeKatex, { output: "html" }], [rehypeSanitize, schema]],
      children: md,
    })
  );
  console.log(`\n========== ${name} ==========\n${html}`);
  return html;
}

const main = render(SAMPLE, "SAMPLE");
const xss = render(XSS, "XSS");

// 断言
const checks = [
  ["KaTeX 类名保留（katex）", main.includes('class="katex')],
  ["块级公式渲染", main.includes("katex-display")],
  ["代码块保留 shell 变量", main.includes("$HOME")],
  ["表格渲染", main.includes("<table")],
  ["嵌套列表渲染", main.includes("<ul>") && main.includes("<li>")],
  ["引用渲染", main.includes("<blockquote")],
  ["图片渲染", main.includes("<img")],
  ["script 被剥离", !xss.includes("<script")],
  ["onerror 被剥离", !xss.includes("onerror")],
  ["javascript: 链接被拦截", !xss.includes("javascript:")],
  ["原始 HTML 链接 onclick 被剥离", !xss.includes("onclick")],
];
console.log("\n========== CHECKS ==========");
let fail = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? "✅" : "❌"} ${label}`);
  if (!ok) fail++;
}
process.exit(fail === 0 ? 0 : 1);
