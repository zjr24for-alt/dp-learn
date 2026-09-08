"use client";

import { useEffect, useState } from "react";
import { CATEGORY_META } from "@/lib/types";
import type { Article } from "@/lib/types";
import { ProgressCheck } from "@/components/progress-bar";
import { readingTime as calcReadingTime } from "@/components/reading-time";
import { Markdown } from "@/components/markdown";
import { getUserArticle, deleteUserArticle } from "@/lib/user-content-store";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ArticleLink {
  slug: string;
  title: string;
}

interface Props {
  slug: string;
  /** 内置文章由服务端直接传入：SSR 时正文即渲染进 HTML，无需客户端等待 */
  builtinArticle: Article | null;
  prevArticle: ArticleLink | null;
  nextArticle: ArticleLink | null;
}

export function ArticleContent({ slug, builtinArticle, prevArticle, nextArticle }: Props) {
  const router = useRouter();
  const [userArticle, setUserArticle] = useState<Article | null>(null);
  // 内置文章立即可用；用户笔记需从 IndexedDB 异步加载
  const [loading, setLoading] = useState(!builtinArticle);

  // 内置文章未命中时，从 IndexedDB 加载用户笔记
  useEffect(() => {
    if (builtinArticle) return;
    let cancelled = false;
    getUserArticle(slug).then((a) => {
      if (cancelled) return;
      setUserArticle(a);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [slug, builtinArticle]);

  const article = builtinArticle || userArticle;

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
        <Link href="/learn" className="text-indigo-600 hover:underline">
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
          <ProgressCheck slug={article.slug} />
          {isUser && (
            <Link
              href={`/contribute?edit=${article.slug}`}
              className="text-xs text-indigo-600 hover:underline ml-auto"
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

      <article className="prose prose-zinc max-w-none">
        <Markdown content={article.content} />
      </article>

      {!isUser && article.sourceFiles && article.sourceFiles.length > 0 && (
        <div className="mt-10 p-4 bg-zinc-50 rounded-lg border border-zinc-200">
          <p className="text-sm text-zinc-600">
            📝 本文来自你的 dp备忘录 项目，源文件：{article.sourceFiles.join(", ")}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between mt-8 pt-6 border-t border-zinc-200">
        {prevArticle ? (
          <Link href={`/learn/${prevArticle.slug}`} className="text-sm text-zinc-600 hover:text-zinc-900 flex items-center gap-1">
            ← {prevArticle.title}
          </Link>
        ) : (
          <div />
        )}
        {nextArticle ? (
          <Link href={`/learn/${nextArticle.slug}`} className="text-sm text-zinc-600 hover:text-zinc-900 flex items-center gap-1 text-right">
            {nextArticle.title} →
          </Link>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
