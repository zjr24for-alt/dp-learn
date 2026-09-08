"use client";

import { memo, useMemo } from "react";
import dynamic from "next/dynamic";
import { LightMarkdown } from "./light";

// KaTeX 渲染器按需加载：只有内容含公式时才下载（remark-math + rehype-katex + katex CSS）。
// 保持服务端渲染（默认 ssr:true）：公式内容在构建期就输出到静态 HTML；
// 客户端仍按需下载 katex chunk，不含公式的页面不会加载它。
const MathMarkdown = dynamic(() => import("./math").then((m) => m.MathMarkdown), {
  loading: () => null,
});

/**
 * 检测内容是否含数学公式分隔符。
 * 先剔除代码块与行内代码，避免 shell 变量（$HOME、$(date) 等）误触发 KaTeX 加载。
 */
function hasMathDelimiters(content: string): boolean {
  const withoutCode = content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`\n]*`/g, "");
  return /\$\$[\s\S]+?\$\$|\$[^$\n]+\$/.test(withoutCode);
}

/** 统一 Markdown 渲染入口：GFM + 消毒，内容含公式时自动切换到 KaTeX 渲染器 */
export const Markdown = memo(function Markdown({ content }: { content: string }) {
  const hasMath = useMemo(() => hasMathDelimiters(content), [content]);
  return hasMath ? <MathMarkdown content={content} /> : <LightMarkdown content={content} />;
});
