import Fuse from "fuse.js";
import type { SearchIndexItem } from "./types";

let fuseInstance: Fuse<SearchIndexItem> | null = null;
let allItems: SearchIndexItem[] = [];

export function buildSearchIndex(items: SearchIndexItem[]): void {
  allItems = items;
  fuseInstance = new Fuse(items, {
    keys: [
      { name: "title", weight: 2 },
      { name: "content", weight: 1 },
      { name: "category", weight: 0.5 },
      { name: "tags", weight: 1.5 },
    ],
    threshold: 0.4,
    distance: 100,
    includeScore: true,
    minMatchCharLength: 1,
  });
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
