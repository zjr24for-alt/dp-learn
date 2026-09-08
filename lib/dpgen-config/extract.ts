/**
 * AI 答案解析：把 chat 返回的文本（可能含 markdown 围栏/解释文字）解析成可填入配置框的内容。
 */

type ExtractJsonOk = { ok: true; value: string };
type ExtractJsonFail = { ok: false; error: string };
export type ExtractJsonResult = ExtractJsonOk | ExtractJsonFail;

function isObjLike(v: unknown): boolean {
  return typeof v === "object" && v !== null;
}

/** 从 startIdx 开始尝试括号平衡扫描，命中即 JSON.parse */
function tryParseSpan(text: string, startIdx: number): { ok: boolean; value?: unknown } {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = startIdx; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === "{" || c === "[") {
      depth++;
    } else if (c === "}" || c === "]") {
      depth--;
      if (depth === 0) {
        try {
          const v = JSON.parse(text.slice(startIdx, i + 1));
          if (isObjLike(v)) return { ok: true, value: v };
        } catch {
          /* not valid JSON, continue scanning */
        }
        return { ok: false };
      }
    }
  }
  return { ok: false };
}

/**
 * 从 AI 答案文本中提取 JSON（param.json / machine.json）。
 * 容忍代码围栏、前后解释文字；成功时返回美化后的 JSON 字符串。
 */
export function extractJsonFromText(text: string): ExtractJsonResult {
  // 1. 整段直接解析
  const trimmed = text.trim();
  if (trimmed !== "") {
    try {
      const v = JSON.parse(trimmed);
      if (isObjLike(v)) return { ok: true, value: JSON.stringify(v, null, 2) };
    } catch {
      /* fall through */
    }
  }

  // 2. 去掉 markdown 代码围栏后再试
  const stripped = trimmed
    .replace(/```(?:json|javascript|js)?/gi, "")
    .replace(/```/g, "")
    .trim();
  if (stripped !== "") {
    try {
      const v = JSON.parse(stripped);
      if (isObjLike(v)) return { ok: true, value: JSON.stringify(v, null, 2) };
    } catch {
      /* fall through */
    }
  }

  // 3. 扫描括号平衡，找到首个合法 JSON 片段
  for (let i = 0; i < stripped.length; i++) {
    const c = stripped[i];
    if (c === "{" || c === "[") {
      const span = tryParseSpan(stripped, i);
      if (span.ok) {
        return { ok: true, value: JSON.stringify(span.value, null, 2) };
      }
    }
  }

  return { ok: false, error: "未能从文本中提取到合法 JSON。请确认 AI 返回的是完整的 param.json / machine.json。" };
}

/**
 * 从 AI 答案文本中提取 INCAR：保留 KEY = value 行、# 注释行、空行，
 * 丢弃 markdown 围栏、表格、散文行。
 */
export function extractIncarFromText(text: string): string {
  const lines: string[] = [];
  for (const raw of text.split("\n")) {
    const noBackticks = raw.replace(/`+/g, "");
    const trimmed = noBackticks.trim();
    if (trimmed === "") {
      lines.push("");
      continue;
    }
    // 丢弃 markdown 表格行
    if (trimmed.includes("|")) continue;
    // 去掉列表/引用前缀
    const cleaned = trimmed.replace(/^[-*+]\s+/, "").replace(/^>\s*/, "");
    // 保留 key=value 或注释行
    if (cleaned.includes("=") || cleaned.startsWith("#")) {
      lines.push(cleaned);
    }
  }
  // 去掉尾部空行
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") lines.pop();
  return lines.join("\n");
}

/**
 * 纯文本解析（LAMMPS / 提交脚本等）：只去掉 markdown 代码围栏，保留原文。
 */
export function extractPlainText(text: string): string {
  return text
    .replace(/```(?:json|bash|sh|python|lammps)?/gi, "")
    .replace(/```/g, "")
    .trim();
}

/**
 * 清理 JSON 字符串中的常见复制痕迹：
 * - BOM 字符
 * - Markdown 代码围栏 (```json ... ```)
 * - 尾随逗号 ({"a": 1,} → {"a": 1})
 * - 前后多余空白/散文
 *
 * 成功时返回美化后的 JSON；失败时返回清理后的原文（让用户自己修）。
 */
export function sanitizeJsonString(raw: string): string {
  let text = raw;

  // BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  // Markdown 围栏
  text = text.replace(/```(?:json|javascript|js)?/gi, "").replace(/```/g, "").trim();

  // 尾随逗号：,} → }  ,] → ]（容忍空白）
  text = text.replace(/,\s*([}\]])/g, "$1");

  // 直接解析
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    // fall through
  }

  // 括号平衡扫描，提取首个合法 JSON 片段
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "{" || text[i] === "[") {
      const span = tryParseSpan(text, i);
      if (span.ok) return JSON.stringify(span.value, null, 2);
    }
  }

  return text;
}
