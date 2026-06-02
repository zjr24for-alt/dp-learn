"use client";

import { useEffect, useState } from "react";
import { getProgress, toggleProgress as toggleProgressStore } from "@/lib/progress-store";

export function ProgressCheck({ slug }: { slug: string }) {
  const [checked, setChecked] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const p = getProgress(slug);
    setChecked(p?.completed ?? false);
  }, [slug]);

  const handleToggle = () => {
    const entry = toggleProgressStore(slug);
    setChecked(!!entry?.completed);
  };

  if (!mounted) {
    return <span className="w-4 h-4 rounded border border-zinc-300" />;
  }

  return (
    <button
      onClick={handleToggle}
      className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
        checked
          ? "bg-green-500 border-green-500 text-white"
          : "border-zinc-300 hover:border-green-400 bg-white"
      }`}
      title={checked ? "已学完，点击取消" : "标记为已学"}
    >
      {checked && (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}

export function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-zinc-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-sm font-medium text-zinc-600 shrink-0">
        {completed}/{total} ({percent}%)
      </span>
    </div>
  );
}
