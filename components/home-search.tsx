"use client";

import { useCallback, useEffect } from "react";
import { SearchBar } from "@/components/search-bar";
import { initSearchIndex, search } from "@/lib/search";
import type { SearchIndexItem } from "@/lib/types";

/** 首页搜索区：接收服务端构建的索引，挂载后初始化全局 Fuse 实例并追加用户笔记 */
export function HomeSearch({ items }: { items: SearchIndexItem[] }) {
  useEffect(() => {
    void initSearchIndex(items);
  }, [items]);

  const handleSearch = useCallback(
    (query: string): SearchIndexItem[] => search(query),
    []
  );

  return <SearchBar onSearch={handleSearch} />;
}
