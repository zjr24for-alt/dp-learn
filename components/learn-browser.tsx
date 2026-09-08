"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CATEGORY_META, type Category } from "@/lib/types";
import type { ArticleSummary, SearchIndexItem } from "@/lib/types";
import { initSearchIndex, search } from "@/lib/search";
import { SearchBar } from "@/components/search-bar";
import { ArticleCard } from "@/components/article-card";
import { getAllUserArticles } from "@/lib/user-content-store";

interface Props {
  /** 内置文章摘要（服务端传入，不含正文） */
  articles: ArticleSummary[];
  /** 全局搜索索引（服务端构建，含全文） */
  indexItems: SearchIndexItem[];
}

export function LearnBrowser({ articles, indexItems }: Props) {
  const searchParams = useSearchParams();
  const initialCategory = (searchParams.get("category") as Category) || "all";

  const [activeCategory, setActiveCategory] = useState<Category | "all">(initialCategory);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "title">("recent");
  const [userArticles, setUserArticles] = useState<ArticleSummary[]>([]);

  useEffect(() => {
    void initSearchIndex(indexItems);
    let cancelled = false;
    getAllUserArticles().then((articles) => {
      if (!cancelled) setUserArticles(articles);
    });
    return () => {
      cancelled = true;
    };
  }, [indexItems]);

  // 合并内置文章和用户文章
  const mergedArticles = useMemo(() => {
    return [...articles, ...userArticles];
  }, [articles, userArticles]);

  const filteredArticles = useMemo(() => {
    let list = mergedArticles;

    if (activeCategory !== "all") {
      list = list.filter((a) => a.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const results = search(searchQuery);
      const slugs = new Set(results.filter((r) => r.type === "article").map((r) => r.id));
      // 也匹配用户文章（它们不在搜索索引中，但标题/摘要/标签可能匹配）
      const userSlugs = new Set(
        userArticles
          .filter(
            (a) =>
              a.title.includes(searchQuery) ||
              a.summary.includes(searchQuery) ||
              a.tags.some((t) => t.includes(searchQuery))
          )
          .map((a) => a.slug)
      );
      const allSlugs = new Set([...slugs, ...userSlugs]);
      list = list.filter((a) => allSlugs.has(a.slug));
    }

    // 排序：默认按最后更新倒序，可选按标题
    const sorted = [...list];
    if (sortBy === "title") {
      sorted.sort((a, b) => a.title.localeCompare(b.title, "zh"));
    } else {
      sorted.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
    }
    return sorted;
  }, [activeCategory, searchQuery, mergedArticles, userArticles, sortBy]);

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    return search(q);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">📚 知识库</h1>
        <span className="text-sm text-zinc-500">{filteredArticles.length} 篇文章</span>
      </div>

      {/* Search */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex-1">
          <SearchBar onSearch={handleSearch} />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "recent" | "title")}
          className="shrink-0 px-3 py-2 border border-zinc-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="recent">最近更新</option>
          <option value="title">按标题</option>
        </select>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 mb-8 flex-wrap">
        <button
          onClick={() => setActiveCategory("all")}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            activeCategory === "all"
              ? "bg-zinc-900 text-white"
              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
          }`}
        >
          全部
        </button>
        {Object.entries(CATEGORY_META).map(([key, meta]) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key as Category)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeCategory === key
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {meta.icon} {meta.label}
          </button>
        ))}
      </div>

      {/* Article grid */}
      {filteredArticles.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredArticles.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-zinc-400">
          <div className="text-4xl mb-4">🔍</div>
          <p>没有找到匹配的文章</p>
          <p className="text-sm mt-2">试试其他关键词或分类</p>
        </div>
      )}
    </div>
  );
}
