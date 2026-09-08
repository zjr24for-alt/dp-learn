import Fuse from "fuse.js";
import type { SearchIndexItem } from "./types";

/**
 * QA 检索：基于搜索索引项（服务端构建、RSC props 传入，含全文内容），
 * 用 Fuse.js 模糊检索 Top-N 最相关内容片段。
 */
export interface QASnippet {
  title: string;
  snippet: string;
  url?: string;
  isOfficial: boolean;
  source: string;
}

interface QADocument {
  title: string;
  snippet: string;
  url?: string;
  isOfficial: boolean;
  source: string;
  searchText: string;
}

// 缓存 Fuse 实例避免每次提问重建（索引条目数不变时复用）
let _qaFuse: Fuse<QADocument> | null = null;
let _qaDocCount = 0;

export function retrieveRelevant(
  question: string,
  items: SearchIndexItem[],
  topK = 5
): QASnippet[] {
  if (!question.trim() || items.length === 0) return [];

  // 复用缓存的 Fuse 实例，直接搜索
  if (_qaFuse && _qaDocCount === items.length) {
    const results = _qaFuse.search(question.trim());
    return results.slice(0, topK).map((r) => ({
      title: r.item.title,
      snippet: r.item.snippet,
      url: r.item.url,
      isOfficial: r.item.isOfficial,
      source: r.item.source,
    }));
  }

  // 重建索引（索引条目变化时）
  const documents: QADocument[] = items.map((it) => {
    const isOfficial = it.type === "doc";
    let title = it.title;
    if (isOfficial) {
      const source = it.category.replace("official-", "").toUpperCase();
      title = `[${source}] ${it.title}`;
    } else if (it.type === "cheatsheet") {
      title = `📋 ${it.title}`;
    }
    return {
      title,
      snippet: it.content.slice(0, 200),
      url: it.url,
      isOfficial,
      source: it.category,
      searchText: it.content,
    };
  });

  _qaFuse = new Fuse(documents, {
    keys: [
      { name: "title", weight: 3 },
      { name: "searchText", weight: 1 },
    ],
    threshold: 0.45,
    distance: 200,
    includeScore: true,
    minMatchCharLength: 1,
    ignoreLocation: true,
  });
  _qaDocCount = items.length;

  const results = _qaFuse.search(question.trim());

  return results.slice(0, topK).map((r) => ({
    title: r.item.title,
    snippet: r.item.snippet,
    url: r.item.url,
    isOfficial: r.item.isOfficial,
    source: r.item.source,
  }));
}

/**
 * 将检索片段拼接成 AI 提示的上下文，限制总长度避免 token 浪费
 */
export function buildContext(snippets: QASnippet[], maxChars = 4000): string {
  const parts: string[] = [];
  let totalLen = 0;
  for (let i = 0; i < snippets.length; i++) {
    const s = snippets[i];
    const part = `[来源 ${i + 1}] ${s.title}\n${s.isOfficial ? `官方链接: ${s.url}\n` : ""}${s.snippet}`;
    if (totalLen + part.length > maxChars && parts.length > 0) break;
    parts.push(part);
    totalLen += part.length;
  }
  return parts.join("\n\n---\n\n");
}
