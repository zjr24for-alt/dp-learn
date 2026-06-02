"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { allArticles, buildAllSearchIndex } from "@/content/index";
import { CATEGORY_META, type Category } from "@/lib/types";
import type { SearchIndexItem } from "@/lib/types";
import { buildSearchIndex, search as doSearch } from "@/lib/search";
import { SearchBar } from "@/components/search-bar";
import { ArticleCard } from "@/components/article-card";
import { getCategoryProgress } from "@/lib/progress-store";

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const idx = buildAllSearchIndex();
    buildSearchIndex(idx);
  }, []);

  const handleSearch = useCallback((query: string): SearchIndexItem[] => {
    return doSearch(query);
  }, []);

  const categories = Object.entries(CATEGORY_META) as [Category, (typeof CATEGORY_META)[Category]][];
  const recentArticles = allArticles.slice(0, 6);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero */}
      <section className="text-center mb-12">
        <h1 className="text-4xl font-bold text-zinc-900 mb-3">
          ⚛️ DP Learn
        </h1>
        <p className="text-lg text-zinc-500 mb-6 max-w-2xl mx-auto">
          Deep Potential 学习笔记 — 整合 DP-GEN / DeePMD / VASP / LAMMPS 实战经验与官方文档
        </p>
        <div className="flex justify-center">
          <SearchBar onSearch={handleSearch} />
        </div>
        <div className="flex justify-center gap-3 mt-6 flex-wrap">
          <Link
            href="/learn"
            className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors"
          >
            📚 浏览知识库
          </Link>
          <Link
            href="/cheatsheet"
            className="px-4 py-2 rounded-lg border border-zinc-300 text-zinc-700 text-sm font-medium hover:bg-zinc-50 transition-colors"
          >
            📋 速查表
          </Link>
          <Link
            href="/qa"
            className="px-4 py-2 rounded-lg border border-zinc-300 text-zinc-700 text-sm font-medium hover:bg-zinc-50 transition-colors"
          >
            💬 智能问答
          </Link>
        </div>
      </section>

      {/* Category grid */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-zinc-900 mb-4">知识分类</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {categories.map(([key, meta]) => {
            const slugs = allArticles.filter((a) => a.category === key).map((a) => a.slug);
            const progress = mounted ? getCategoryProgress(slugs) : { percent: 0, completed: 0, total: slugs.length };
            return (
              <Link
                key={key}
                href={`/learn?category=${key}`}
                className="border border-zinc-200 rounded-xl p-4 bg-white hover:shadow-md hover:border-zinc-300 transition-all duration-200 text-center"
              >
                <div className="text-2xl mb-2">{meta.icon}</div>
                <div className="text-sm font-medium text-zinc-800 mb-1">{meta.label}</div>
                <div className="text-xs text-zinc-400">{progress.total} 篇</div>
                {mounted && progress.total > 0 && (
                  <div className="mt-2 h-1 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-400 rounded-full transition-all"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      {/* Recent articles */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-zinc-900">知识条目</h2>
          <Link href="/learn" className="text-sm text-zinc-500 hover:text-zinc-900">
            查看全部 ({allArticles.length}) →
          </Link>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recentArticles.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="border border-zinc-200 rounded-xl p-6 bg-white text-center">
          <div className="text-3xl mb-3">📚</div>
          <h3 className="font-semibold text-zinc-900 mb-2">结构化知识</h3>
          <p className="text-sm text-zinc-500">
            {allArticles.length} 篇实战笔记，涵盖 DP-GEN 工作流到 VASP 调错，按类别组织
          </p>
        </div>
        <div className="border border-zinc-200 rounded-xl p-6 bg-white text-center">
          <div className="text-3xl mb-3">🔍</div>
          <h3 className="font-semibold text-zinc-900 mb-2">智能检索</h3>
          <p className="text-sm text-zinc-500">
            全局搜索 + 垂直领域问答，整合 DP/VASP/LAMMPS 官方文档
          </p>
        </div>
        <div className="border border-zinc-200 rounded-xl p-6 bg-white text-center">
          <div className="text-3xl mb-3">✅</div>
          <h3 className="font-semibold text-zinc-900 mb-2">进度追踪</h3>
          <p className="text-sm text-zinc-500">
            标记学习进度，按类别查看完成率，记录你的 DP 学习之旅
          </p>
        </div>
      </section>
    </div>
  );
}
