"use client";

import { CopyButton } from "@/components/copy-button";
import type { Components } from "react-markdown";
import type { Element } from "hast";

/** 从 pre 节点的第一个子元素（code）提取语言与代码文本 */
function getCodeInfo(node?: Element): { lang: string; text: string } {
  const codeNode = node?.children?.[0];
  if (!codeNode || codeNode.type !== "element" || codeNode.tagName !== "code") {
    return { lang: "", text: "" };
  }
  const cls = codeNode.properties?.className;
  const lang = Array.isArray(cls)
    ? String(cls[0] ?? "").replace(/^language-/, "")
    : "";
  const text = (codeNode.children ?? [])
    .map((c) => (c.type === "text" ? c.value : ""))
    .join("");
  return { lang, text };
}

/**
 * 自定义渲染组件：
 * - `pre`：代码块外壳（语言标签 + 复制按钮 + 滚动容器），保持原有 zinc 视觉风格
 * - `table`：包一层横向滚动容器，避免宽表格撑破布局
 * - `a`：外链统一新窗口打开
 */
export const markdownComponents: Components = {
  a: (props) => (
    <a
      href={props.href}
      title={props.title}
      target="_blank"
      rel="noopener noreferrer"
      className="text-indigo-600 hover:text-indigo-500"
    >
      {props.children}
    </a>
  ),
  pre: ({ node, children }) => {
    const { lang, text } = getCodeInfo(node);
    return (
      <div className="not-prose relative group mb-5">
        <div className="dark-code-header flex items-center justify-between rounded-t-lg px-4 py-1.5">
          {lang ? (
            <span className="text-xs text-indigo-300 font-mono truncate">{lang}</span>
          ) : (
            <span />
          )}
          <span className="opacity-60 group-hover:opacity-100 transition-opacity shrink-0">
            <CopyButton text={text} className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700" />
          </span>
        </div>
        <pre className="dark-code-block rounded-b-lg p-4 overflow-x-auto text-sm border border-zinc-800 border-t-0 leading-relaxed">
          {children}
        </pre>
      </div>
    );
  },
  table: (props) => (
    <div className="overflow-x-auto mb-5">
      <table>{props.children}</table>
    </div>
  ),
};
