import type { Article, CheatsheetItem, DocEntry, SearchIndexItem } from "@/lib/types";
import { dpgenWorkflowArticles } from "./dpgen-workflow";
import { deepmdTrainingArticles } from "./deepmd-training";
import { vaspHpcArticles } from "./vasp-hpc";
import { envConfigArticles } from "./env-config";
import { linuxTipsArticles } from "./linux-tips";
import { methodologyArticles } from "./methodology";
import { cheatsheetItems } from "./cheatsheet";
import { officialDocs } from "./official-docs/index";

/** 全部文章 */
export const allArticles: Article[] = [
  ...dpgenWorkflowArticles,
  ...deepmdTrainingArticles,
  ...vaspHpcArticles,
  ...envConfigArticles,
  ...linuxTipsArticles,
  ...methodologyArticles,
];

/** 按类别获取文章 */
export function getArticlesByCategory(category: string): Article[] {
  return allArticles.filter((a) => a.category === category);
}

/** 按 slug 获取单篇文章 */
export function getArticleBySlug(slug: string): Article | undefined {
  return allArticles.find((a) => a.slug === slug);
}

/** 速查表 */
export { cheatsheetItems };

/** 官方文档 */
export { officialDocs };

/** 构建全局搜索索引 */
export function buildAllSearchIndex(): SearchIndexItem[] {
  const items: SearchIndexItem[] = [];

  for (const article of allArticles) {
    items.push({
      id: article.slug,
      title: article.title,
      content: article.summary + " " + article.content.slice(0, 500),
      category: article.category,
      url: `/learn/${article.slug}`,
      type: "article",
    });
  }

  for (const doc of officialDocs) {
    items.push({
      id: doc.id,
      title: doc.title,
      content: doc.summary + " " + doc.content,
      category: `official-${doc.source}`,
      url: doc.url,
      type: "doc",
    });
  }

  for (const cs of cheatsheetItems) {
    items.push({
      id: cs.id,
      title: cs.label,
      content: cs.description + " " + cs.code,
      category: cs.category,
      url: "/cheatsheet",
      type: "cheatsheet",
    });
  }

  return items;
}
