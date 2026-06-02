import { search } from "./search";
import type { DocEntry, Article, CheatsheetItem } from "./types";

/**
 * 合并所有知识源（文章 + 官方文档 + 速查表），
 * 检索 Top-N 最相关内容片段。
 */
export interface QASnippet {
  title: string;
  snippet: string;
  url?: string;
  isOfficial: boolean;
  source: string;
}

export function retrieveRelevant(
  question: string,
  articles: Article[],
  docs: DocEntry[],
  cheatsheets: CheatsheetItem[],
  topK = 5
): QASnippet[] {
  const results: { item: QASnippet; score: number }[] = [];

  // Simple TF-IDF-like scoring (fuse.js would be better but here we do direct matching)
  const queryTerms = question.toLowerCase().split(/\s+/);

  function scoreText(text: string): number {
    const lower = text.toLowerCase();
    let s = 0;
    for (const term of queryTerms) {
      if (term.length < 2) continue;
      const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      const matches = lower.match(regex);
      if (matches) s += matches.length;
    }
    return s;
  }

  // Search articles
  for (const article of articles) {
    const s = scoreText(article.title + " " + article.summary + " " + article.content);
    if (s > 0) {
      results.push({
        item: {
          title: article.title,
          snippet: article.summary || article.content.slice(0, 200),
          url: `/learn/${article.slug}`,
          isOfficial: false,
          source: article.category,
        },
        score: s,
      });
    }
  }

  // Search official docs
  for (const doc of docs) {
    const s = scoreText(doc.title + " " + doc.summary + " " + doc.content);
    if (s > 0) {
      results.push({
        item: {
          title: `[${doc.source.toUpperCase()}] ${doc.title}`,
          snippet: doc.summary,
          url: doc.url,
          isOfficial: true,
          source: doc.source,
        },
        score: s * 1.2, // Boost official docs slightly
      });
    }
  }

  // Search cheatsheets
  for (const cs of cheatsheets) {
    const s = scoreText(cs.label + " " + cs.description + " " + cs.code);
    if (s > 0) {
      results.push({
        item: {
          title: `📋 ${cs.label}`,
          snippet: `${cs.description}\n\`\`\`\n${cs.code}\n\`\`\``,
          url: "/cheatsheet",
          isOfficial: false,
          source: "cheatsheet",
        },
        score: s,
      });
    }
  }

  // Sort by score descending, take top K
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK).map((r) => r.item);
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
