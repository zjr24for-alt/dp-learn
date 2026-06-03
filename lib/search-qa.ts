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
  // 用于 Fuse 检索的拼接字段
  searchText: string;
}

export function retrieveRelevant(
  question: string,
  articles: Article[],
  docs: DocEntry[],
  cheatsheets: CheatsheetItem[],
  topK = 5
): QASnippet[] {
  if (!question.trim()) return [];

  // 构建 Fuse 可搜索的文档列表
  const documents: QADocument[] = [];

  for (const article of articles) {
    documents.push({
      type: "article",
      title: article.title,
      snippet: article.summary || article.content.slice(0, 200),
      url: `/learn/${article.slug}`,
      isOfficial: false,
      source: article.category,
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
      searchText: `${cs.label} ${cs.description} ${cs.code}`,
    });
  }

  const fuse = new Fuse(documents, {
    keys: [{ name: "title", weight: 2 }, { name: "searchText", weight: 1 }],
    threshold: 0.6,
    distance: 200,
    includeScore: true,
    minMatchCharLength: 1,
    // 忽略大小写，中文也能模糊匹配
    ignoreLocation: true,
  });

  const results = fuse.search(question.trim());

  return results.slice(0, topK).map((r) => ({
    title: r.item.title,
    snippet: r.item.snippet,
    url: r.item.url,
    isOfficial: r.item.isOfficial,
    source: r.item.source,
  }));
}

/**
 * 将检索片段拼接成 AI 提示的上下文
 */
export function buildContext(snippets: QASnippet[]): string {
  return snippets
    .map(
      (s, i) =>
        `[来源 ${i + 1}] ${s.title}\n${s.isOfficial ? `官方链接: ${s.url}\n` : ""}${s.snippet}`
    )
    .join("\n\n---\n\n");
}
