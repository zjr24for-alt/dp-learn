"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { allArticles, buildAllSearchIndex } from "@/content/index";
import { buildSearchIndex } from "@/lib/search";
import { CATEGORY_META } from "@/lib/types";
import { ProgressCheck } from "@/components/progress-bar";
import Link from "next/link";

export function ArticleContent({ slug: serverSlug }: { slug: string }) {
  const params = useParams();
  // 优先从客户端路由 params 获取，静态导出下更可靠
  const slug = (params?.slug as string) || serverSlug;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    buildSearchIndex(buildAllSearchIndex());
  }, []);

  const article = useMemo(() => allArticles.find((a) => a.slug === slug), [slug]);

  const navArticles = useMemo(() => {
    if (!article) return { prev: null, next: null };
    const sameCategory = allArticles.filter((a) => a.category === article.category);
    const idx = sameCategory.findIndex((a) => a.slug === slug);
    return {
      prev: idx > 0 ? sameCategory[idx - 1] : null,
      next: idx < sameCategory.length - 1 ? sameCategory[idx + 1] : null,
    };
  }, [article, slug]);

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

  const renderContent = (content: string) => {
    let html = content
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-6 mb-2 text-zinc-800">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-8 mb-3 text-zinc-900">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-8 mb-4 text-zinc-900">$1</h1>')
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-zinc-100 rounded-lg p-4 overflow-x-auto text-sm mb-4"><code>$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code class="bg-zinc-100 text-amber-700 px-1 py-0.5 rounded text-sm">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>')
      .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-blue-400 pl-4 py-1 my-3 text-zinc-600 italic">$1</blockquote>')
      .replace(/^---$/gm, '<hr class="my-6 border-zinc-200">')
      .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-zinc-800">$1</li>')
      .replace(/\n\n/g, '</p><p class="text-zinc-800 leading-relaxed mb-3">')
      .replace(/\n/g, '<br/>');

    html = '<p class="text-zinc-800 leading-relaxed mb-3">' + html + '</p>';
    html = html.replace(/<p class="[^"]*"><\/p>/g, '');
    return html;
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 text-sm text-zinc-400 mb-6">
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
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${meta.color}`}>
            {meta.icon} {meta.label}
          </span>
          {mounted && <ProgressCheck slug={article.slug} />}
        </div>
        <h1 className="text-3xl font-bold text-zinc-900 mb-3">{article.title}</h1>
        <p className="text-zinc-500">{article.summary}</p>
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          {article.tags.map((tag) => (
            <span key={tag} className="text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded">
              {tag}
            </span>
          ))}
        </div>
        {article.sourceFiles.length > 0 && (
          <p className="text-xs text-zinc-400 mt-3">
            来源：{article.sourceFiles.join(", ")}
          </p>
        )}
      </div>

      <article
        className="prose prose-zinc max-w-none"
        dangerouslySetInnerHTML={{ __html: renderContent(article.content) }}
      />

      <div className="mt-10 p-4 bg-zinc-50 rounded-lg border border-zinc-200">
        <p className="text-sm text-zinc-500">
          📝 本文来自你的 dp备忘录 项目，源文件：{article.sourceFiles.join(", ")}
        </p>
      </div>

      <div className="flex items-center justify-between mt-8 pt-6 border-t border-zinc-200">
        {navArticles.prev ? (
          <Link href={`/learn/${navArticles.prev.slug}`} className="text-sm text-zinc-500 hover:text-zinc-900 flex items-center gap-1">
            ← {navArticles.prev.title}
          </Link>
        ) : (
          <div />
        )}
        {navArticles.next ? (
          <Link href={`/learn/${navArticles.next.slug}`} className="text-sm text-zinc-500 hover:text-zinc-900 flex items-center gap-1 text-right">
            {navArticles.next.title} →
          </Link>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
