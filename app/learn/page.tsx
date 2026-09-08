import { Suspense } from "react";
import { allArticles, buildAllSearchIndex } from "@/content/index";
import { LearnBrowser } from "@/components/learn-browser";
import type { Article, ArticleSummary } from "@/lib/types";

/** 文章 → 摘要投影（列表卡片不需要正文） */
function toSummary(a: Article): ArticleSummary {
  return {
    slug: a.slug,
    title: a.title,
    summary: a.summary,
    category: a.category,
    tags: a.tags,
    updatedAt: a.updatedAt,
    isUserArticle: a.isUserArticle,
  };
}

export default function LearnPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="animate-pulse text-center py-16 text-zinc-400">加载中...</div>
        </div>
      }
    >
      <LearnBrowser
        articles={allArticles.map(toSummary)}
        indexItems={buildAllSearchIndex()}
      />
    </Suspense>
  );
}
