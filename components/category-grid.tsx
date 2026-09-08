"use client";

import Link from "next/link";
import { useHydrated } from "@/lib/use-hydrated";
import { getCategoryProgress } from "@/lib/progress-store";
import type { Category } from "@/lib/types";

interface CategoryMeta {
  label: string;
  icon: string;
  color: string;
}

interface Props {
  categories: [Category, CategoryMeta][];
  categorySlugs: Record<Category, string[]>;
}

/** 首页分类网格（进度条来自 localStorage，水合后渲染） */
export function CategoryGrid({ categories, categorySlugs }: Props) {
  const hydrated = useHydrated();

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {categories.map(([key, meta]) => {
        const slugs = categorySlugs[key] ?? [];
        const progress = hydrated
          ? getCategoryProgress(slugs)
          : { percent: 0, completed: 0, total: slugs.length };
        return (
          <Link
            key={key}
            href={`/learn?category=${key}`}
            className="border border-zinc-200 rounded-xl p-4 bg-white hover:shadow-lg hover:border-zinc-300 hover:-translate-y-0.5 transition-all duration-200 text-center"
          >
            <div className="text-2xl mb-2">{meta.icon}</div>
            <div className="text-sm font-medium text-zinc-800 mb-1">{meta.label}</div>
            <div className="text-xs text-zinc-400">{progress.total} 篇</div>
            {hydrated && progress.total > 0 && (
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
  );
}
