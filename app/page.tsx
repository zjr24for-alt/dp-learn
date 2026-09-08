import Link from "next/link";
import { allArticles, buildAllSearchIndex } from "@/content/index";
import { CATEGORY_META, type Category, type Article, type ArticleSummary } from "@/lib/types";
import { HomeSearch } from "@/components/home-search";
import { CategoryGrid } from "@/components/category-grid";
import { RecentArticles } from "@/components/recent-articles";

/** 文章 → 摘要投影（不含正文，避免正文进入客户端 bundle / RSC payload） */
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

export default function HomePage() {
  const index = buildAllSearchIndex();
  const categories = Object.entries(CATEGORY_META) as [Category, (typeof CATEGORY_META)[Category]][];

  const categorySlugs = {} as Record<Category, string[]>;
  for (const [key] of categories) {
    categorySlugs[key] = allArticles.filter((a) => a.category === key).map((a) => a.slug);
  }
  const recent = [...allArticles]
    .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))
    .slice(0, 6)
    .map(toSummary);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero */}
      <section className="text-center mb-12 relative">
        {/* 品牌色背景光晕 */}
        <div className="absolute inset-x-0 -top-16 h-80 -z-10 overflow-hidden" aria-hidden="true">
          <div className="absolute left-1/2 -translate-x-1/2 w-[38rem] h-[26rem] rounded-full bg-indigo-200/40 blur-3xl" />
        </div>
        <h1 className="text-4xl font-bold text-zinc-900 mb-3">
          ⚛️ DP Learn
        </h1>
        <p className="text-lg text-zinc-500 mb-6 max-w-2xl mx-auto">
          Deep Potential 学习笔记 — 整合 DP-GEN / DeePMD / VASP / LAMMPS 实战经验与官方文档
        </p>
        <div className="flex justify-center">
          <HomeSearch items={index} />
        </div>
        <div className="flex justify-center gap-3 mt-6 flex-wrap">
          <Link
            href="/learn"
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-colors"
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
          <Link
            href="/contribute"
            className="px-4 py-2 rounded-lg border border-zinc-300 text-zinc-700 text-sm font-medium hover:bg-zinc-50 transition-colors"
          >
            ✏️ 写笔记
          </Link>
        </div>
      </section>

      {/* Category grid */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-zinc-900 mb-4">知识分类</h2>
        <CategoryGrid categories={categories} categorySlugs={categorySlugs} />
      </section>

      {/* Recent articles */}
      <RecentArticles builtin={recent} totalBuiltin={allArticles.length} />

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
