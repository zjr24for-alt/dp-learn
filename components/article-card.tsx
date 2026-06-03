import { memo } from "react";
import Link from "next/link";
import type { Article } from "@/lib/types";
import { CATEGORY_META } from "@/lib/types";
import { ProgressCheck } from "./progress-bar";

interface Props {
  article: Article;
}

export const ArticleCard = memo(function ArticleCard({ article }: Props) {
  const meta = CATEGORY_META[article.category];

  return (
    <div className="group border border-zinc-200 rounded-xl p-5 bg-white hover:shadow-md hover:border-zinc-300 transition-all duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {article.isUserArticle ? (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                📝 我的笔记
              </span>
            ) : (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${meta.color}`}>
                {meta.icon} {meta.label}
              </span>
            )}
            <ProgressCheck slug={article.slug} />
          </div>
          <Link href={`/learn/${article.slug}`} className="block">
            <h3 className="font-semibold text-zinc-900 group-hover:text-zinc-600 transition-colors mb-1.5">
              {article.title}
            </h3>
            <p className="text-sm text-zinc-500 line-clamp-2">{article.summary}</p>
          </Link>
          <div className="flex items-center gap-1.5 mt-3 flex-wrap">
            {article.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="text-xs text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});
