"use client";

import { useCallback, useState, useMemo, useRef } from "react";
import type { ParamField } from "@/lib/dpgen-config";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  schema: ParamField[];
  language: "json" | "incar";
  title: string;
}

interface SchemaDocPanelProps {
  schema: ParamField[];
  flatSchema: ParamField[];
  searchTerm: string;
  onParamClick: (key: string) => void;
}

function SchemaDocPanel({ schema, flatSchema, searchTerm, onParamClick }: SchemaDocPanelProps) {
  const filtered = useMemo(() => {
    if (!searchTerm) return [];
    const lower = searchTerm.toLowerCase();
    // 用 flattened schema 搜索，才能搜到嵌套参数
    return flatSchema.filter(
      (p) =>
        p.key.toLowerCase().includes(lower) ||
        p.key.split(".").pop()?.toLowerCase().includes(lower) ||
        p.label.toLowerCase().includes(lower) ||
        p.description.toLowerCase().includes(lower)
    );
  }, [flatSchema, searchTerm]);

  if (!searchTerm) {
    return (
      <div className="text-sm text-slate-400 text-center py-8">
        ← 选中左侧 JSON 中的参数名称即可查看文档
      </div>
    );
  }

  if (filtered.length === 0) {
    return <div className="text-sm text-amber-500 text-center py-8">未找到匹配参数</div>;
  }

  return (
    <div className="space-y-3">
      {filtered.map((p) => (
        <div
          key={p.key}
          className="bg-white rounded-lg border border-slate-200 p-3 cursor-pointer hover:border-blue-300 transition-colors"
          onClick={() => onParamClick(p.key)}
        >
          <div className="flex items-start justify-between gap-2">
            <code className="text-sm font-mono text-blue-700 font-semibold whitespace-nowrap">
              {p.key}
            </code>
            <span className="text-xs font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded shrink-0">
              {p.type}
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {p.label} · {p.required ? <span className="text-red-500">必需</span> : <span className="text-slate-400">可选</span>}
            {p.default !== "-" && ` · 默认: ${p.default}`}
          </div>
          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{p.description}</p>
          {p.enum && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {p.enum.map((v) => (
                <span key={v} className="text-xs font-mono bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                  {v}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** 扁平化 schema：展开 children 成为一维数组 */
function flattenSchema(schema: ParamField[]): ParamField[] {
  const result: ParamField[] = [];
  for (const p of schema) {
    result.push(p);
    if (p.children) {
      result.push(...flattenSchema(p.children));
    }
  }
  return result;
}

/** 智能匹配：先找完整 key，再找短名（key 的最后一段） */
function findParam(flatSchema: ParamField[], key: string): ParamField | null {
  // 1. 精确全名匹配
  const exact = flatSchema.find((p) => p.key === key);
  if (exact) return exact;

  // 2. 短名匹配（key 的最后一段）
  const shortMatch = flatSchema.find((p) => p.key.split(".").pop() === key);
  if (shortMatch) return shortMatch;

  // 3. 包含匹配
  const fuzzy = flatSchema.find((p) => p.key.endsWith(`.${key}`) || p.key === key);
  if (fuzzy) return fuzzy;

  return null;
}

export function CodeEditor({ value, onChange, schema, language, title }: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const docPanelRef = useRef<HTMLDivElement>(null);
  const [docSearch, setDocSearch] = useState("");
  const [copied, setCopied] = useState(false);

  const flatSchema = useMemo(() => flattenSchema(schema), [schema]);

  // Handle text selection to detect parameter names
  const handleSelect = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // 如果没选中文字，尝试自动扩展选中当前参数名
    let selected: string;
    if (start === end) {
      // 尝试取光标所在位置的单词
      const text = textarea.value;
      let s = start;
      let e = start;
      while (s > 0 && /[a-zA-Z0-9_]/.test(text[s - 1])) s--;
      while (e < text.length && /[a-zA-Z0-9_]/.test(text[e])) e++;
      selected = text.substring(s, e);
    } else {
      selected = textarea.value.substring(start, end);
    }

    if (selected && selected.length < 50) {
      const cleanKey = selected.replace(/["':]/g, "").trim();
      const found = findParam(flatSchema, cleanKey);
      if (found) {
        setDocSearch(found.key);
      }
    }
  }, [flatSchema]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [value]);

  const lineCount = value.split("\n").length;

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* Left: Editor */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
          <button
            onClick={handleCopy}
            className="text-xs px-3 py-1.5 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          >
            {copied ? "✓ 已复制" : "📋 复制"}
          </button>
        </div>
        <div className="relative border border-slate-200 rounded-lg overflow-hidden bg-white">
          {/* Line numbers + Editor side by side */}
          <div className="flex">
            <div className="select-none text-right px-3 py-4 text-xs text-slate-300 font-mono leading-5 bg-slate-50 border-r border-slate-200 min-w-[3rem]">
              {Array.from({ length: Math.max(lineCount, 1) }, (_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onMouseUp={handleSelect}
              onKeyUp={handleSelect}
              onClick={handleSelect}
              className="flex-1 p-4 text-xs font-mono leading-5 text-slate-800 bg-white resize-none focus:outline-none focus:ring-1 focus:ring-blue-300 min-h-[400px] whitespace-pre overflow-auto"
              spellCheck={false}
              style={{ tabSize: 2 }}
            />
          </div>
        </div>
      </div>

      {/* Right: Documentation panel - sticky */}
      <div ref={docPanelRef} className="lg:w-72 xl:w-80 shrink-0">
        <div className="sticky top-4">
          <div className="mb-2">
            <input
              type="text"
              value={docSearch}
              onChange={(e) => setDocSearch(e.target.value)}
              placeholder="搜索参数..."
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
            />
          </div>
          <div className="overflow-y-auto max-h-[70vh] pr-1">
            <SchemaDocPanel schema={schema} flatSchema={flatSchema} searchTerm={docSearch} onParamClick={setDocSearch} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function validateJson(json: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  try {
    const parsed = JSON.parse(json);
    if (typeof parsed !== "object" || parsed === null) {
      errors.push("JSON 必须是一个对象或数组");
    }
  } catch (e: any) {
    errors.push(`JSON 语法错误: ${e.message}`);
  }
  return { valid: errors.length === 0, errors };
}
