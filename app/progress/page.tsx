"use client";

import { useEffect, useState } from "react";
import { allArticles } from "@/content/index";
import { CATEGORY_META, type Category } from "@/lib/types";
import { getAllProgress, getCategoryProgress, resetAllProgress } from "@/lib/progress-store";
import { ProgressBar } from "@/components/progress-bar";
import { ProgressCheck } from "@/components/progress-bar";
import Link from "next/link";

export default function ProgressPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-zinc-900 mb-6">📊 学习进度</h1>
        <div className="animate-pulse text-center py-16 text-zinc-400">加载中...</div>
      </div>
    );
  }

  const categories = Object.entries(CATEGORY_META) as [Category, (typeof CATEGORY_META)[Category]][];
  const totalSlugs = allArticles.map((a) => a.slug);
  const totalProgress = getCategoryProgress(totalSlugs);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">📊 学习进度</h1>
        <button
          onClick={() => {
            if (confirm("确定要重置所有学习进度吗？此操作不可撤销。")) {
              resetAllProgress();
              window.location.reload();
            }
          }}
          className="text-xs text-red-500 hover:text-red-600 px-3 py-1.5 rounded-md border border-red-200 hover:bg-red-50 transition-colors"
        >
          重置全部进度
        </button>
      </div>

      {/* Overall progress */}
      <div className="border border-zinc-200 rounded-xl p-6 bg-white mb-8">
        <h2 className="font-semibold text-zinc-900 mb-4">总体进度</h2>
        <ProgressBar completed={totalProgress.completed} total={totalProgress.total} />
      </div>

      {/* Per category */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        {categories.map(([key, meta]) => {
          const slugs = allArticles.filter((a) => a.category === key).map((a) => a.slug);
          const progress = getCategoryProgress(slugs);
          return (
            <div key={key} className="border border-zinc-200 rounded-xl p-5 bg-white">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{meta.icon}</span>
                <h3 className="font-semibold text-zinc-900">{meta.label}</h3>
              </div>
              <ProgressBar completed={progress.completed} total={progress.total} />
            </div>
          );
        })}
      </div>

      {/* Per article checklist */}
      <h2 className="text-lg font-bold text-zinc-900 mb-4">知识点清单</h2>
      <div className="space-y-1">
        {categories.map(([key, meta]) => {
          const articles = allArticles.filter((a) => a.category === key);
          return (
            <details key={key} className="border border-zinc-200 rounded-xl bg-white overflow-hidden">
              <summary className="px-5 py-3 cursor-pointer hover:bg-zinc-50 font-medium text-zinc-800 text-sm flex items-center gap-2">
                <span>{meta.icon}</span>
                {meta.label}
                <span className="text-zinc-400 text-xs ml-auto">
                  {getCategoryProgress(articles.map((a) => a.slug)).completed}/{articles.length}
                </span>
              </summary>
              <div className="border-t border-zinc-100 px-5 py-2 space-y-1">
                {articles.map((article) => (
                  <div key={article.slug} className="flex items-center gap-3 py-1.5">
                    <ProgressCheck slug={article.slug} />
                    <Link
                      href={`/learn/${article.slug}`}
                      className="text-sm text-zinc-700 hover:text-zinc-900 flex-1"
                    >
                      {article.title}
                    </Link>
                    <span className="text-xs text-zinc-400">{article.tags.slice(0, 2).join(", ")}</span>
                  </div>
                ))}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
