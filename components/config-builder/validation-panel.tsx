"use client";

import { useMemo, useState } from "react";
import type { CheckIssue, CheckSeverity, ValidationResult } from "@/lib/dpgen-config";

export interface ValidationGroup {
  id: string;
  file: string;
  label?: string;
  result?: ValidationResult;
  skipped?: boolean;
}

export interface ValidationTotals {
  errors: number;
  warnings: number;
  skipped: number;
}

/** 聚合所有校验组的总数（面板与就绪度门禁共用，避免重复逻辑） */
export function countValidationTotals(groups: ValidationGroup[]): ValidationTotals {
  let errors = 0;
  let warnings = 0;
  let skipped = 0;
  for (const g of groups) {
    if (g.skipped || !g.result) {
      skipped++;
      continue;
    }
    errors += g.result.errorCount;
    warnings += g.result.warningCount;
  }
  return { errors, warnings, skipped };
}

const SEVERITY_BADGE: Record<CheckSeverity, string> = {
  error: "bg-red-100 text-red-700",
  warning: "bg-amber-100 text-amber-700",
  info: "bg-sky-100 text-sky-700",
};

const SEVERITY_LABEL: Record<CheckSeverity, string> = {
  error: "错误",
  warning: "警告",
  info: "提示",
};

function IssueItem({
  issue,
  groupId,
  onJump,
}: {
  issue: CheckIssue;
  groupId: string;
  onJump?: (groupId: string, line: number) => void;
}) {
  return (
    <li className="flex items-start gap-2 text-xs">
      <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium mt-0.5 ${SEVERITY_BADGE[issue.severity]}`}>
        {SEVERITY_LABEL[issue.severity]}
      </span>
      <div className="min-w-0 flex-1">
        <span className="text-slate-700">{issue.message}</span>
        {issue.path && <span className="ml-1.5 font-mono text-slate-400">{issue.path}</span>}
        {issue.hint && <div className="text-slate-400 mt-0.5">💡 {issue.hint}</div>}
      </div>
      {typeof issue.line === "number" && onJump && (
        <button
          type="button"
          onClick={() => onJump(groupId, issue.line as number)}
          className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors mt-0.5"
        >
          <span className="font-mono">L{issue.line}</span>跳转
        </button>
      )}
    </li>
  );
}

function GroupRow({ group, onJump }: { group: ValidationGroup; onJump?: (groupId: string, line: number) => void }) {
  const [open, setOpen] = useState(false);
  const result = group.result;

  if (group.skipped || !result) {
    return (
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full shrink-0 bg-slate-300" />
          <span className="text-sm font-medium text-slate-500">{group.file}</span>
          {group.label && <span className="text-xs text-slate-400 truncate">{group.label}</span>}
        </div>
        <span className="text-xs text-slate-400 shrink-0">未填写，跳过</span>
      </div>
    );
  }

  const hasError = result.errorCount > 0;
  const hasWarning = result.warningCount > 0;
  const dot = hasError ? "bg-red-500" : hasWarning ? "bg-amber-400" : "bg-green-500";
  const statusText = hasError
    ? `${result.errorCount} 错误`
    : hasWarning
    ? `${result.warningCount} 警告`
    : "✓ 通过";
  const statusColor = hasError ? "text-red-600" : hasWarning ? "text-amber-600" : "text-green-600";
  const hasIssues = result.issues.length > 0;

  return (
    <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
          <span className="text-sm font-medium text-slate-700">{group.file}</span>
          {group.label && <span className="text-xs text-slate-400 truncate">{group.label}</span>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className={`text-xs font-medium ${statusColor}`}>{statusText}</span>
          {hasIssues && <span className="text-xs text-slate-400">{open ? "▲" : "▼"}</span>}
        </div>
      </button>
      {open && hasIssues && (
        <ul className="px-4 py-2.5 border-t border-slate-100 space-y-1.5">
          {result.issues.map((issue, i) => (
            <IssueItem key={i} issue={issue} groupId={group.id} onJump={onJump} />
          ))}
        </ul>
      )}
    </div>
  );
}

export function ValidationPanel({
  groups,
  onJumpToLine,
}: {
  groups: ValidationGroup[];
  onJumpToLine?: (groupId: string, line: number) => void;
}) {
  const totals = useMemo(() => countValidationTotals(groups), [groups]);

  const summaryDot = totals.errors > 0 ? "bg-red-500" : totals.warnings > 0 ? "bg-amber-400" : "bg-green-500";
  const summaryText =
    totals.errors > 0
      ? `共 ${totals.errors} 个错误需要处理`
      : totals.warnings > 0
      ? `共 ${totals.warnings} 个警告，建议查看`
      : totals.skipped > 0
      ? `未填写 ${totals.skipped} 项，其余全部通过 ✓`
      : "全部通过 ✓";

  return (
    <div className="mt-4">
      <div
        className={`mb-2 flex items-center gap-2 text-sm font-medium ${
          totals.errors > 0 ? "text-red-600" : totals.warnings > 0 ? "text-amber-600" : "text-green-600"
        }`}
      >
        <span className={`w-2.5 h-2.5 rounded-full ${summaryDot}`} />
        {summaryText}
      </div>
      <div className="space-y-1.5">
        {groups.map((g) => (
          <GroupRow key={g.id} group={g} onJump={onJumpToLine} />
        ))}
      </div>
    </div>
  );
}
