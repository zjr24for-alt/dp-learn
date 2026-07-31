"use client";

import { useCallback, useState } from "react";
import { extractIncarFromText, extractJsonFromText, extractPlainText } from "@/lib/dpgen-config";

export type AiAssistMode = "prompt" | "paste";
export type ExtractKind = "json" | "incar" | "text";

interface AiAssistProps {
  open: boolean;
  onClose: () => void;
  mode: AiAssistMode;
  title: string;
  prompt: string;
  extractKind: ExtractKind;
  onFill: (value: string, ok: boolean, message: string) => void;
}

export function AiAssist({ open, onClose, mode, title, prompt, extractKind, onFill }: AiAssistProps) {
  const [copied, setCopied] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [fillMsg, setFillMsg] = useState<string | null>(null);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [prompt]);

  const handleParseFill = useCallback(() => {
    if (!pasteText.trim()) {
      setFillMsg("请先粘贴 AI 的答案");
      return;
    }
    let value: string;
    let ok: boolean;
    let msg: string;
    if (extractKind === "json") {
      const res = extractJsonFromText(pasteText);
      value = res.ok ? res.value : "";
      ok = res.ok;
      msg = res.ok ? "✅ 已解析并填入" : `❌ ${res.error}`;
    } else if (extractKind === "incar") {
      value = extractIncarFromText(pasteText);
      ok = value.trim() !== "";
      msg = ok ? "✅ 已解析并填入" : "❌ 未提取到有效的 INCAR 参数行";
    } else {
      value = extractPlainText(pasteText);
      ok = value.trim() !== "";
      msg = ok ? "✅ 已解析并填入" : "❌ 未提取到有效内容";
    }
    setFillMsg(msg);
    onFill(value, ok, msg);
  }, [pasteText, extractKind, onFill]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 shrink-0">
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none px-1"
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        <div className="p-5 overflow-y-auto">
          {mode === "prompt" ? (
            <div>
              <p className="text-xs text-slate-500 mb-2">
                复制下面的提示词，粘贴到 matchat 提问。AI 返回答案后，点「📥 回贴答案」把答案粘贴回来即可自动填入。
              </p>
              <textarea
                readOnly
                value={prompt}
                className="w-full h-64 text-xs font-mono border border-slate-200 rounded-lg p-3 bg-slate-50 text-slate-800 resize-none focus:outline-none"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={handleCopy}
                className="mt-3 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {copied ? "✓ 已复制" : "📋 复制提示词"}
              </button>
            </div>
          ) : (
            <div>
              <p className="text-xs text-slate-500 mb-2">
                把 AI 返回的答案粘贴到下面，点「解析并填入」。会自动去除代码块和解释文字，只保留配置内容。
              </p>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="粘贴 AI 的答案..."
                className="w-full h-40 text-xs font-mono border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-blue-300 resize-none"
                spellCheck={false}
              />
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleParseFill}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  🔍 解析并填入
                </button>
                {fillMsg && (
                  <span className={`text-xs ${fillMsg.startsWith("✅") ? "text-green-600" : "text-red-500"}`}>{fillMsg}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
