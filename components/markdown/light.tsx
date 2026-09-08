"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { markdownComponents } from "./components";
import { markdownSchema } from "./schema";

/** 轻量渲染器：GFM（表格/删除线/任务列表）+ 消毒，不打包 KaTeX */
export function LightMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[[rehypeSanitize, markdownSchema]]}
      components={markdownComponents}
    >
      {content}
    </ReactMarkdown>
  );
}
