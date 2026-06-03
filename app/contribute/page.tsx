"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ArticleEditor } from "@/components/article-editor";
import { getAllUserArticles, deleteUserArticle } from "@/lib/user-content-store";
import { CATEGORY_META, type Article } from "@/lib/types";
import Link from "next/link";

function ContributeContent() {
  const searchParams = useSearchParams();
  const editSlug = searchParams.get("edit");

  const [userArticles, setUserArticles] = useState<Article[]>([]);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllUserArticles().then((articles) => {
      setUserArticles(articles);
      if (editSlug) {
        const found = articles.find((a) => a.slug === editSlug);
        if (found) setEditingArticle(found);
      }
      setLoading(false);
    });
  }, [editSlug]);

  const handleDelete = async (slug: string) => {
    if (!confirm("确定要删除这篇笔记吗？")) return;
    await deleteUserArticle(slug);
    setUserArticles((prev) => prev.filter((a) => a.slug !== slug));
    if (editingArticle?.slug === slug) setEditingArticle(null);
  };

  const handleSaved = () => {
    // 保存后刷新列表
    getAllUserArticles().then(setUserArticles);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">
          ✏️ {editingArticle ? "编辑笔记" : "写笔记"}
        </h1>
        <p className="text-zinc-500 text-sm">
          记录你的学习心得，扩充个人知识库。支持 Markdown 语法。
        </p>
      </div>

      {/* 编辑器 */}
      <div className="bg-white border border-zinc-200 rounded-xl p-6 mb-10">
        <ArticleEditor
          key={editingArticle?.slug || "new"}
          initialArticle={editingArticle || undefined}
          onSaved={handleSaved}
        />
      </div>

      {/* 我的笔记列表 */}
      {loading ? (
        <div className="text-center py-8 text-zinc-400 animate-pulse">加载中...</div>
      ) : userArticles.length > 0 ? (
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">
            📝 我的笔记 ({userArticles.length})
          </h2>
          <div className="space-y-3">
            {userArticles.map((article) => {
              const meta = CATEGORY_META[article.category];
              const isActive = editingArticle?.slug === article.slug;
              return (
                <div
                  key={article.slug}
                  className={`flex items-center gap-4 p-4 border rounded-lg transition-colors ${
                    isActive
                      ? "border-blue-300 bg-blue-50"
                      : "border-zinc-200 bg-white hover:border-zinc-300"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/learn/${article.slug}`}
                      className="font-medium text-zinc-900 hover:text-blue-600 transition-colors"
                    >
                      {article.title}
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${meta.color}`}>
                        {meta.icon} {meta.label}
                      </span>
                      <span className="text-xs text-zinc-400">
                        {article.updatedAt
                          ? new Date(article.updatedAt).toLocaleDateString("zh-CN")
                          : ""}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setEditingArticle(article)}
                      className="text-xs text-blue-600 hover:underline px-2 py-1"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(article.slug)}
                      className="text-xs text-red-500 hover:text-red-700 px-2 py-1"
                    >
                      删除
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function ContributePage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="animate-pulse text-center py-16 text-zinc-400">加载中...</div>
        </div>
      }
    >
      <ContributeContent />
    </Suspense>
  );
}
