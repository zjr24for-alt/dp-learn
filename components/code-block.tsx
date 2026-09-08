"use client";

import { CopyButton } from "@/components/copy-button";

/** 可复用的代码块（语言标签 + 复制按钮），与 Markdown 渲染的代码块风格一致 */
export function CodeBlock({ lang, code }: { lang?: string; code: string }) {
  return (
    <div className="not-prose relative group mb-4">
      <div className="dark-code-header flex items-center justify-between rounded-t-lg px-4 py-1.5">
        <span className="text-xs text-indigo-300 font-mono truncate">{lang ?? ""}</span>
        <span className="opacity-60 group-hover:opacity-100 transition-opacity shrink-0">
          <CopyButton text={code} className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700" />
        </span>
      </div>
      <pre className="dark-code-block rounded-b-lg p-4 overflow-x-auto text-sm border border-zinc-800 border-t-0 leading-relaxed">
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  );
}
