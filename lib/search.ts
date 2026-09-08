import Fuse from "fuse.js";
import type { Article, SearchIndexItem } from "./types";
import { getAllUserArticles } from "./user-content-store";

/** 共享 Fuse 配置，避免重复定义 */
const FUSE_OPTIONS = {
  keys: [
    { name: "title" as const, weight: 2 },
    { name: "content" as const, weight: 1 },
    { name: "category" as const, weight: 0.5 },
    { name: "tags" as const, weight: 1.5 },
  ],
  threshold: 0.4,
  distance: 100,
  includeScore: true,
  minMatchCharLength: 1,
};

let fuseInstance: Fuse<SearchIndexItem> | null = null;
let allItems: SearchIndexItem[] = [];
let lastItemCount = 0;

/** 构建全局搜索索引（幂等——数据不变时跳过重建） */
export function buildSearchIndex(items: SearchIndexItem[]): void {
  allItems = items;
  if (fuseInstance && lastItemCount === items.length) return;
  fuseInstance = new Fuse(items, FUSE_OPTIONS);
  lastItemCount = items.length;
}

/** 向搜索索引追加新条目（如用户文章），并重建 Fuse 实例 */
export function appendToSearchIndex(items: SearchIndexItem[]): void {
  // 去重：已存在的 id 不重复添加
  const existingIds = new Set(allItems.map((i) => i.id));
  const newItems = items.filter((i) => !existingIds.has(i.id));
  if (newItems.length === 0) return;

  allItems = [...allItems, ...newItems];
  fuseInstance = new Fuse(allItems, FUSE_OPTIONS);
  lastItemCount = allItems.length;
}

export function search(query: string, limit = 10): SearchIndexItem[] {
  if (!fuseInstance || !query.trim()) {
    return allItems.slice(0, limit);
  }
  const results = fuseInstance.search(query.trim());
  return results.slice(0, limit).map((r) => r.item);
}

export function searchByCategory(
  query: string,
  category: string,
  limit = 10
): SearchIndexItem[] {
  const results = search(query, 100);
  return results.filter((r) => r.category === category).slice(0, limit);
}

export function getAllItems(): SearchIndexItem[] {
  return allItems;
}

/** 用户文章 → 搜索索引项（与原有首页/知识库追加逻辑一致） */
export function articleToSearchIndexItem(a: Article): SearchIndexItem {
  return {
    id: a.slug,
    title: a.title,
    content: a.summary + " " + a.content.slice(0, 500),
    category: a.category,
    url: `/learn/${a.slug}`,
    type: "article",
  };
}

/**
 * 初始化全局搜索索引：内置条目 + 追加 IndexedDB 用户笔记。
 * 幂等（数据量未变时跳过 Fuse 重建）；供各页面的搜索组件在挂载后调用。
 */
export async function initSearchIndex(items: SearchIndexItem[]): Promise<void> {
  buildSearchIndex(items);
  const userArticles = await getAllUserArticles();
  if (userArticles.length > 0) {
    appendToSearchIndex(userArticles.map(articleToSearchIndexItem));
  }
}
