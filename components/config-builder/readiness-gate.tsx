"use client";

import { useMemo } from "react";
import { CHECK_CODES } from "@/lib/dpgen-config";
import { countValidationTotals, type ValidationGroup } from "./validation-panel";

/**
 * 提交就绪度门禁：聚合「一键检查全部」的结果为整体 go/no-go 结论，
 * 并给出提交前的冒烟测试清单。纯客户端，不重复运行校验逻辑。
 */

interface SmokeCheck {
  id: string;
  label: string;
  command: string;
  /** manual：只能人工执行（恒 ⏳）；derived：根据校验问题码自动判定 */
  kind: "manual" | "derived";
  failCode?: string;
}

const SMOKE_CHECKS: SmokeCheck[] = [
  { id: "vasp_dry", label: "VASP 干跑", command: "vasp -n", kind: "manual" },
  { id: "sbatch_test", label: "调度器试跑", command: "sbatch --test-only job.pbs", kind: "manual" },
  { id: "dos2unix", label: "行尾转换", command: "dos2unix INCAR_fp job.pbs in.lammps", kind: "derived", failCode: CHECK_CODES.submitCrlf },
  { id: "module", label: "环境加载", command: "module load …", kind: "derived", failCode: CHECK_CODES.submitNoModule },
  { id: "mpi", label: "并行启动命令", command: "mpirun/mpiexec/srun", kind: "derived", failCode: CHECK_CODES.submitNoMpirun },
  { id: "sched_head", label: "调度头", command: "#PBS / #SBATCH", kind: "derived", failCode: CHECK_CODES.submitNoPbsSbatch },
  { id: "ldlib", label: "动态库隔离", command: "unset LD_LIBRARY_PATH", kind: "derived", failCode: CHECK_CODES.submitNoLdLibrary },
  { id: "lammps_units", label: "LAMMPS 单位", command: "units metal", kind: "derived", failCode: CHECK_CODES.lammpsUnits },
];

export function ReadinessGate({ groups }: { groups: ValidationGroup[] }) {
  const totals = useMemo(() => countValidationTotals(groups), [groups]);

  // 聚合所有校验组中出现过的问题码
  const failedCodes = useMemo(() => {
    const codes = new Set<string>();
    for (const g of groups) {
      for (const issue of g.result?.issues ?? []) {
        if (issue.code) codes.add(issue.code);
      }
    }
    return codes;
  }, [groups]);

  const filesWithErrors = useMemo(() => groups.filter((g) => (g.result?.errorCount ?? 0) > 0), [groups]);
  const skippedFiles = useMemo(() => groups.filter((g) => g.skipped || !g.result), [groups]);

  const level = totals.errors > 0 ? "error" : totals.warnings > 0 ? "warning" : "pass";
  const banner = {
    error: {
      bg: "bg-red-50 border-red-200",
      dot: "bg-red-500",
      text: "text-red-700",
      title: `不可提交：共 ${totals.errors} 个错误需修复`,
    },
    warning: {
      bg: "bg-amber-50 border-amber-200",
      dot: "bg-amber-400",
      text: "text-amber-700",
      title: `可提交，但建议先处理 ${totals.warnings} 个警告`,
    },
    pass: {
      bg: "bg-green-50 border-green-200",
      dot: "bg-green-500",
      text: "text-green-700",
      title: "全部通过，可提交",
    },
  }[level];

  return (
    <div className="mt-4 space-y-3">
      {/* 就绪度横幅 */}
      <div className={`rounded-xl border p-4 ${banner.bg}`}>
        <div className="flex items-start gap-2">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${banner.dot}`} />
          <div className="min-w-0">
            <p className={`text-sm font-semibold ${banner.text}`}>{banner.title}</p>
            <p className="text-xs text-slate-500 mt-1">
              「可提交」仅为静态配置结论，集群侧文件 / 可执行状态请以「冒烟测试」为准。
            </p>
            {filesWithErrors.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {filesWithErrors.map((g) => (
                  <span
                    key={g.id}
                    className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 font-mono"
                  >
                    {g.file}
                    {g.label ? ` · ${g.label}` : ""}（{g.result?.errorCount}）
                  </span>
                ))}
              </div>
            )}
            {skippedFiles.length > 0 && (
              <p className="text-xs text-amber-600 mt-2">
                以下配置未填写，提交前请补齐：{skippedFiles.map((g) => g.file).join("、")}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 冒烟测试清单 */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h4 className="text-xs font-semibold text-slate-700 mb-2">🧪 提交前冒烟测试</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SMOKE_CHECKS.map((item) => {
            const status =
              item.kind === "manual"
                ? "na"
                : item.failCode && failedCodes.has(item.failCode)
                ? "todo"
                : "ok";
            const icon = status === "ok" ? "✓" : status === "todo" ? "✗" : "⏳";
            const iconCls =
              status === "ok"
                ? "bg-green-100 text-green-700"
                : status === "todo"
                ? "bg-red-100 text-red-700"
                : "bg-slate-100 text-slate-500";
            const label =
              status === "ok" ? "已通过" : status === "todo" ? "需处理" : "待手动执行";
            return (
              <div
                key={item.id}
                className="flex items-start gap-2 border border-slate-200 rounded-lg px-3 py-2"
              >
                <span className={`shrink-0 w-4 h-4 rounded text-[10px] leading-4 text-center font-bold mt-0.5 ${iconCls}`}>
                  {icon}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-700">{item.label}</span>
                    <span className="text-[10px] text-slate-400">{label}</span>
                  </div>
                  <code className="text-[11px] font-mono text-slate-500 break-all">{item.command}</code>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
