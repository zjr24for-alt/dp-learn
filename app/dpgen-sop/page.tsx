"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ALL_SOP_SLUGS, SOP_STAGES, type SopFileSource, type SopStage } from "@/lib/sop";

const FILE_SOURCE_BADGE: Record<SopFileSource, string> = {
  existing: "bg-slate-100 text-slate-600",
  prepare: "bg-amber-100 text-amber-700",
  generate: "bg-green-100 text-green-700",
};

const FILE_SOURCE_LABEL: Record<SopFileSource, string> = {
  existing: "已有",
  prepare: "需准备",
  generate: "产出",
};
import { getCategoryProgress, resetAllProgress } from "@/lib/progress-store";
import { ProgressBar, ProgressCheck } from "@/components/progress-bar";

interface StageProgress {
  completed: number;
  total: number;
  percent: number;
}

interface SopProgress {
  total: StageProgress;
  stages: StageProgress[];
}

const EMPTY_PROGRESS = (total: number): StageProgress => ({ completed: 0, total, percent: 0 });

function ChecklistRow({ item, onToggle }: { item: { slug: string; label: string; href?: string }; onToggle: () => void }) {
  return (
    <li className="flex items-center gap-3 py-1">
      <ProgressCheck slug={item.slug} onToggle={onToggle} />
      {item.href ? (
        <Link href={item.href} className="text-sm text-zinc-700 hover:text-blue-600 hover:underline">
          {item.label}
        </Link>
      ) : (
        <span className="text-sm text-zinc-700">{item.label}</span>
      )}
    </li>
  );
}

function StageCard({ stage, stageProgress, onToggle }: { stage: SopStage; stageProgress: StageProgress; onToggle: () => void }) {
  return (
    <section className="bg-white border border-zinc-200 rounded-xl p-5 sm:p-6">
      {/* Header */}
      <header className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center text-sm font-bold shrink-0">
            {stage.num}
          </span>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <span>{stage.icon}</span>
              {stage.title}
            </h2>
            <p className="text-sm text-zinc-500 mt-0.5">{stage.desc}</p>
          </div>
        </div>
        <span className="text-xs font-medium text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full shrink-0">
          {stageProgress.completed}/{stageProgress.total}
        </span>
      </header>

      {/* 所需文件 */}
      {stage.files && stage.files.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-zinc-500 mb-1.5 flex items-center gap-1">
            📁 所需文件
          </h3>
          <ul className="space-y-1">
            {stage.files.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <code className="shrink-0 bg-zinc-100 text-zinc-700 px-1.5 py-0.5 rounded font-mono max-w-[45%] truncate" title={f.name}>
                  {f.name}
                </code>
                <span className="flex-1 text-zinc-500 leading-relaxed">{f.purpose}</span>
                <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${FILE_SOURCE_BADGE[f.source]}`}>
                  {FILE_SOURCE_LABEL[f.source]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* CTA（阶段 2 → 配置构建器） */}
      {stage.cta && (
        <div className="mb-4">
          <Link
            href={stage.cta.href}
            className="inline-block px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors"
          >
            {stage.cta.label}
          </Link>
          <p className="text-xs text-zinc-400 mt-1.5">
            参数生成与校验由配置构建器提供，本页不重复实现。
          </p>
        </div>
      )}

      {/* Command */}
      {stage.command && (
        <pre className="mb-4 p-3 bg-zinc-900 text-zinc-100 text-xs font-mono rounded-lg overflow-x-auto">
          {stage.command}
        </pre>
      )}

      {/* 内嵌说明（缺口内容） */}
      {stage.inlineNotes?.map((note) => (
        <details key={note.title} className="mb-4 group border border-amber-200 bg-amber-50/60 rounded-lg open:pb-3">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-amber-800 select-none">
            📌 {note.title}
          </summary>
          <div className="px-3 pt-1 space-y-2">
            {note.paragraphs.map((p, i) => (
              <p key={i} className="text-sm text-zinc-700 leading-relaxed">
                {p}
              </p>
            ))}
            {note.code && (
              <pre className="p-3 bg-zinc-900 text-zinc-100 text-xs font-mono rounded-lg overflow-x-auto">
                {note.code}
              </pre>
            )}
          </div>
        </details>
      ))}

      {/* 相关阅读 */}
      {stage.links && stage.links.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-400">相关阅读：</span>
          {stage.links.map((l) => (
            <Link
              key={l.href + l.label}
              href={l.href}
              className="text-xs text-zinc-600 bg-zinc-100 hover:bg-zinc-200 px-2 py-1 rounded-full transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}

      {/* Checklist */}
      <ul className="border-t border-zinc-100 pt-2">
        {stage.checklist.map((item) => (
          <ChecklistRow key={item.slug} item={item} onToggle={onToggle} />
        ))}
      </ul>
    </section>
  );
}

export default function DpgenSopPage() {
  const [mounted, setMounted] = useState(false);
  const [progress, setProgress] = useState<SopProgress>({
    total: EMPTY_PROGRESS(ALL_SOP_SLUGS.length),
    stages: SOP_STAGES.map((s) => EMPTY_PROGRESS(s.checklist.length)),
  });

  const refresh = useCallback(() => {
    setProgress({
      total: getCategoryProgress(ALL_SOP_SLUGS),
      stages: SOP_STAGES.map((s) => getCategoryProgress(s.checklist.map((c) => c.slug))),
    });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 既有 hydration 安全模式：SSR 首渲 0 值，mount 后读 localStorage
    setMounted(true);
    refresh();
  }, [refresh]);

  // 新项目重新开始：清空全部勾选进度（与 /progress 共享账本）
  const handleReset = useCallback(() => {
    if (!window.confirm("确认清空本 SOP 全部进度？这也会同时清空「学习进度」页里这些文章的勾选状态。")) return;
    resetAllProgress();
    refresh();
  }, [refresh]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">🧭 DP-GEN 标准流程（SOP）</h1>
          <p className="mt-1 text-sm text-zinc-500">
            拿到新材料 / 新势函数时的固定操作路线：建模 → DFT 参数准备 → init_bulk → 主动学习 → 质量验证。
            按阶段勾选进度，与「学习进度」共享同一份本地账本。
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="shrink-0 px-3 py-1.5 text-xs font-medium bg-white border border-zinc-200 rounded-lg text-zinc-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
        >
          🔁 新项目重新开始
        </button>
      </div>

      {/* 总进度 */}
      <div className="mt-6 mb-8 bg-white border border-zinc-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-zinc-700">总进度</h2>
          {mounted && progress.total.total > 0 && (
            <span className="text-xs text-zinc-400">
              {progress.total.completed}/{progress.total.total}
            </span>
          )}
        </div>
        <ProgressBar
          completed={mounted ? progress.total.completed : 0}
          total={progress.total.total}
        />
      </div>

      {/* 五阶段 */}
      <div className="space-y-4">
        {SOP_STAGES.map((stage, i) => (
          <StageCard
            key={stage.num}
            stage={stage}
            stageProgress={mounted ? progress.stages[i] : EMPTY_PROGRESS(stage.checklist.length)}
            onToggle={refresh}
          />
        ))}
      </div>
    </div>
  );
}
