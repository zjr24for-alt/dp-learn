"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { allArticles, buildAllSearchIndex } from "@/content/index";
import { buildSearchIndex } from "@/lib/search";
import { CATEGORY_META } from "@/lib/types";
import type { Article } from "@/lib/types";
import { ProgressCheck } from "@/components/progress-bar";
import { readingTime as calcReadingTime } from "@/components/reading-time";
import { renderMarkdown } from "@/lib/render-markdown";
import { getUserArticle, deleteUserArticle } from "@/lib/user-content-store";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function ArticleContent({ slug: serverSlug }: { slug: string }) {
  const params = useParams();
  const router = useRouter();
  const slug = (params?.slug as string) || serverSlug;
  const [mounted, setMounted] = useState(false);
  const [userArticle, setUserArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    buildSearchIndex(buildAllSearchIndex());
    // 代码块复制按钮事件委托
    const handler = (e: Event) => {
      const btn = (e.target as HTMLElement).closest(".copy-btn") as HTMLElement | null;
      if (!btn) return;
      const code = btn.dataset.code || "";
      navigator.clipboard?.writeText(code).catch(() => {});
      btn.innerHTML = '<svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
      setTimeout(() => { btn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>'; }, 1500);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // 查找内置文章
  const builtinArticle = useMemo(() => allArticles.find((a) => a.slug === slug), [slug]);

  // 如果内置文章未命中，从 IndexedDB 加载用户文章
  useEffect(() => {
    if (builtinArticle) {
      setLoading(false);
      return;
    }
    getUserArticle(slug).then((a) => {
      setUserArticle(a);
      setLoading(false);
    });
  }, [slug, builtinArticle]);

  const article = builtinArticle || userArticle;

  const navArticles = useMemo(() => {
    if (!article) return { prev: null, next: null };
    const sameCategory = allArticles.filter((a) => a.category === article.category);
    const idx = sameCategory.findIndex((a) => a.slug === slug);
    return {
      prev: idx > 0 ? sameCategory[idx - 1] : null,
      next: idx < sameCategory.length - 1 ? sameCategory[idx + 1] : null,
    };
  }, [article, slug]);

  const handleDelete = async () => {
    if (!confirm("确定要删除这篇笔记吗？此操作不可撤销。")) return;
    await deleteUserArticle(slug);
    router.push("/learn");
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="animate-pulse text-zinc-400">加载中...</div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="text-4xl mb-4">📄</div>
        <h1 className="text-xl font-bold text-zinc-900 mb-2">文章未找到</h1>
        <p className="text-zinc-500 mb-4">slug: {slug}</p>
        <Link href="/learn" className="text-blue-600 hover:underline">
          ← 返回知识库
        </Link>
      </div>
    );
  }

  const meta = CATEGORY_META[article.category];
  const isUser = article.isUserArticle;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 text-sm text-zinc-500 mb-6">
        <Link href="/learn" className="hover:text-zinc-600">知识库</Link>
        <span>/</span>
        <Link href={`/learn?category=${article.category}`} className="hover:text-zinc-600">
          {meta.label}
        </Link>
        <span>/</span>
        <span className="text-zinc-600 truncate">{article.title}</span>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          {isUser ? (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              📝 我的笔记
            </span>
          ) : (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${meta.color}`}>
              {meta.icon} {meta.label}
            </span>
          )}
          {mounted && <ProgressCheck slug={article.slug} />}
          {isUser && (
            <Link
              href={`/contribute?edit=${article.slug}`}
              className="text-xs text-blue-600 hover:underline ml-auto"
            >
              ✏️ 编辑
            </Link>
          )}
          {isUser && (
            <button
              onClick={handleDelete}
              className="text-xs text-red-500 hover:text-red-700"
            >
              🗑️ 删除
            </button>
          )}
        </div>
        <h1 className="text-3xl font-bold text-zinc-900 mb-3">{article.title}</h1>
        <div className="flex items-center gap-4 mb-3">
          <p className="text-zinc-600">{article.summary}</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-zinc-400 mb-4">
          <span>预计阅读 {calcReadingTime(article.content)} 分钟</span>
          <span>{article.content.length} 字符</span>
          <span>{article.tags.length} 个标签</span>
          {isUser && article.updatedAt && (
            <span>更新于 {new Date(article.updatedAt).toLocaleDateString("zh-CN")}</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          {article.tags.map((tag) => (
            <span key={tag} className="text-xs text-zinc-500 bg-zinc-200 px-2 py-0.5 rounded">
              {tag}
            </span>
          ))}
        </div>
        {article.sourceFiles && article.sourceFiles.length > 0 && (
          <p className="text-xs text-zinc-500 mt-3">
            来源：{article.sourceFiles.join(", ")}
          </p>
        )}
      </div>

      <article
        className="prose prose-zinc max-w-none"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(article.content) }}
      />

      {!isUser && article.sourceFiles && article.sourceFiles.length > 0 && (
        <div className="mt-10 p-4 bg-zinc-50 rounded-lg border border-zinc-200">
          <p className="text-sm text-zinc-600">
            📝 本文来自你的 dp备忘录 项目，源文件：{article.sourceFiles.join(", ")}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between mt-8 pt-6 border-t border-zinc-200">
        {navArticles.prev ? (
          <Link href={`/learn/${navArticles.prev.slug}`} className="text-sm text-zinc-600 hover:text-zinc-900 flex items-center gap-1">
            ← {navArticles.prev.title}
          </Link>
        ) : (
          <div />
        )}
        {navArticles.next ? (
          <Link href={`/learn/${navArticles.next.slug}`} className="text-sm text-zinc-600 hover:text-zinc-900 flex items-center gap-1 text-right">
            {navArticles.next.title} →
          </Link>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
