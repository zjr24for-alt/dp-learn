"use client";

import { useEffect, useMemo, useState } from "react";
import { getAllUserArticles } from "@/lib/user-content-store";
import { ArticleCard } from "@/components/article-card";
import Link from "next/link";
import type { ArticleSummary } from "@/lib/types";

interface Props {
  /** 内置文章（服务端按 updatedAt 排序取前 6） */
  builtin: ArticleSummary[];
  /** 内置文章总数（含用户笔记后的展示计数在客户端更新） */
  totalBuiltin: number;
}

/** 首页「最近更新」：内置文章 SSR 直出，挂载后并入 IndexedDB 用户笔记 */
export function RecentArticles({ builtin, totalBuiltin }: Props) {
  const [userArticles, setUserArticles] = useState<ArticleSummary[]>([]);

  useEffect(() => {
    let cancelled = false;
    getAllUserArticles().then((articles) => {
      if (cancelled) return;
      setUserArticles(articles);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const merged = useMemo(
    () =>
      [...builtin, ...userArticles]
        .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))
        .slice(0, 6),
    [builtin, userArticles]
  );

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-zinc-900">最近更新</h2>
        <Link href="/learn" className="text-sm text-zinc-500 hover:text-zinc-900">
          查看全部 ({totalBuiltin + userArticles.length}) →
        </Link>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {merged.map((article) => (
          <ArticleCard key={article.slug} article={article} />
        ))}
      </div>
    </section>
  );
}
