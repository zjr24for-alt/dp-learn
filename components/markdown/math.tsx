"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeSanitize from "rehype-sanitize";
import "katex/dist/katex.min.css";
import { markdownComponents } from "./components";
import { markdownSchema } from "./schema";

/**
 * 数学渲染器：在轻量渲染器基础上加入 remark-math + rehype-katex。
 * 仅当内容检测到公式分隔符时才动态加载（见 ./index.tsx），
 * 平时不进入客户端 bundle。
 *
 * 语法（remark-math v6）：
 * - 行内：$E = mc^2$ 或 $$C_L$$
 * - 块级（围栏式，$$ 单独成行）：
 *   $$
 *   \int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}
 *   $$
 *
 * `output: "html"` 关闭 MathML 输出，减小体积并简化消毒 schema。
 */
export function MathMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[
        [rehypeKatex, { output: "html" }],
        [rehypeSanitize, markdownSchema],
      ]}
      components={markdownComponents}
    >
      {content}
    </ReactMarkdown>
  );
}
