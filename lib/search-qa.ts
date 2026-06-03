import Fuse from "fuse.js";
import type { DocEntry, Article, CheatsheetItem } from "./types";

/**
 * 合并所有知识源（文章 + 官方文档 + 速查表），
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
  type: "article" | "doc" | "cheatsheet";
  title: string;
  snippet: string;
  url?: string;
  isOfficial: boolean;
  source: string;
  tags: string;
  // 用于 Fuse 检索的拼接字段
  searchText: string;
}

// 缓存 Fuse 实例避免每次提问重建（文档总数不变时复用）
let _qaFuse: Fuse<QADocument> | null = null;
let _qaDocCount = 0;

export function retrieveRelevant(
  question: string,
  articles: Article[],
  docs: DocEntry[],
  cheatsheets: CheatsheetItem[],
  topK = 5
): QASnippet[] {
  if (!question.trim()) return [];

  // 构建 Fuse 可搜索的文档列表（仅在文档数变化时重建）
  const totalDocs = articles.length + docs.length + cheatsheets.length;
  let documents: QADocument[];

  if (_qaFuse && _qaDocCount === totalDocs) {
    // 复用缓存的 Fuse 实例，直接搜索
    const results = _qaFuse.search(question.trim());
    return results.slice(0, topK).map((r) => ({
      title: r.item.title,
      snippet: r.item.snippet,
      url: r.item.url,
      isOfficial: r.item.isOfficial,
      source: r.item.source,
    }));
  }

  // 重建索引
  documents = [];

  for (const article of articles) {
    documents.push({
      type: "article",
      title: article.title,
      snippet: article.summary || article.content.slice(0, 200),
      url: `/learn/${article.slug}`,
      isOfficial: false,
      source: article.category,
      tags: (article.tags || []).join(" "),
      searchText: `${article.title} ${article.summary} ${article.content}`,
    });
  }

  for (const doc of docs) {
    documents.push({
      type: "doc",
      title: `[${doc.source.toUpperCase()}] ${doc.title}`,
      snippet: doc.summary,
      url: doc.url,
      isOfficial: true,
      source: doc.source,
      tags: (doc.tags || []).join(" "),
      searchText: `${doc.title} ${doc.summary} ${doc.content}`,
    });
  }

  for (const cs of cheatsheets) {
    documents.push({
      type: "cheatsheet",
      title: `📋 ${cs.label}`,
      snippet: `${cs.description}\n\`\`\`\n${cs.code}\n\`\`\``,
      url: "/cheatsheet",
      isOfficial: false,
      source: "cheatsheet",
      tags: (cs.tags || []).join(" "),
      searchText: `${cs.label} ${cs.description} ${cs.code}`,
    });
  }

  _qaFuse = new Fuse(documents, {
    keys: [
      { name: "title", weight: 3 },
      { name: "tags", weight: 2 },
      { name: "searchText", weight: 1 },
    ],
    threshold: 0.45,
    distance: 200,
    includeScore: true,
    minMatchCharLength: 1,
    ignoreLocation: true,
  });
  _qaDocCount = totalDocs;

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
