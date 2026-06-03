"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { allArticles, buildAllSearchIndex } from "@/content/index";
import { CATEGORY_META, type Category, type Article } from "@/lib/types";
import { buildSearchIndex, search, appendToSearchIndex } from "@/lib/search";
import { SearchBar } from "@/components/search-bar";
import { ArticleCard } from "@/components/article-card";
import { getAllUserArticles } from "@/lib/user-content-store";

function LearnContent() {
  const searchParams = useSearchParams();
  const initialCategory = (searchParams.get("category") as Category) || "all";

  const [activeCategory, setActiveCategory] = useState<Category | "all">(initialCategory);
  const [searchQuery, setSearchQuery] = useState("");
  const [userArticles, setUserArticles] = useState<Article[]>([]);

  useEffect(() => {
    buildSearchIndex(buildAllSearchIndex());
    getAllUserArticles().then((articles) => {
      setUserArticles(articles);
      // 将用户文章追加到搜索索引
      if (articles.length > 0) {
        appendToSearchIndex(
          articles.map((a) => ({
            id: a.slug,
            title: a.title,
            content: a.summary + " " + a.content.slice(0, 500),
            category: a.category,
            url: `/learn/${a.slug}`,
            type: "article" as const,
          }))
        );
      }
    });
  }, []);

  // 合并内置文章和用户文章
  const mergedArticles = useMemo(() => {
    return [...allArticles, ...userArticles];
  }, [userArticles]);

  const filteredArticles = useMemo(() => {
    let articles = mergedArticles;

    if (activeCategory !== "all") {
      articles = articles.filter((a) => a.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const results = search(searchQuery);
      const slugs = new Set(results.filter((r) => r.type === "article").map((r) => r.id));
      // 也匹配用户文章（它们不在搜索索引中，但 slug 可能匹配）
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
      articles = articles.filter((a) => allSlugs.has(a.slug));
    }

    return articles;
  }, [activeCategory, searchQuery, mergedArticles, userArticles]);

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
      <div className="mb-6">
        <SearchBar onSearch={handleSearch} />
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

export default function LearnPage() {
  return (
    <Suspense fallback={<div className="max-w-6xl mx-auto px-4 py-8"><div className="animate-pulse text-center py-16 text-zinc-400">加载中...</div></div>}>
      <LearnContent />
    </Suspense>
  );
}
