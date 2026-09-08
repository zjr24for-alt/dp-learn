"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { parseLcurve, diagnoseLcurve, type DiagnosisLevel } from "@/lib/lcurve";
import { LineChart } from "@/components/diag/line-chart";
import { useLocalStorage } from "@/lib/use-local-storage";

const HISTORY_KEY = "dp-learn-lcurve-history";

interface HistoryEntry {
  at: string;
  name: string;
  steps: number;
  lastValF: number | null;
  summary: string;
}

const LEVEL_STYLE: Record<DiagnosisLevel, { badge: string; card: string }> = {
  ok: { badge: "bg-green-100 text-green-800", card: "border-green-200" },
  info: { badge: "bg-sky-100 text-sky-800", card: "border-sky-200" },
  warn: { badge: "bg-amber-100 text-amber-800", card: "border-amber-200" },
  danger: { badge: "bg-red-100 text-red-800", card: "border-red-200" },
};

const LEVEL_LABEL: Record<DiagnosisLevel, string> = {
  ok: "正常",
  info: "提示",
  warn: "注意",
  danger: "异常",
};

// 示例数据（模拟一次典型训练：快速下降后收敛）
const EXAMPLE_LCURVE = `#  step      rmse_val    rmse_trn    rmse_e_val  rmse_e_trn    rmse_f_val  rmse_f_trn         lr
0       3.41e+01    3.33e+01      1.03e+01    1.03e+01      8.72e-01    8.39e-01    1.0e-03
1000    2.55e+01    2.41e+01      8.12e+00    7.95e+00      7.10e-01    6.88e-01    9.9e-04
2000    1.87e+01    1.70e+01      6.03e+00    5.77e+00      5.51e-01    5.20e-01    9.8e-04
3000    1.34e+01    1.18e+01      4.40e+00    4.10e+00      4.19e-01    3.88e-01    9.7e-04
5000    8.51e+00    7.12e+00      2.98e+00    2.66e+00      3.02e-01    2.71e-01    9.5e-04
7000    5.62e+00    4.43e+00      2.11e+00    1.81e+00      2.30e-01    1.99e-01    9.3e-04
10000   3.58e+00    2.65e+00      1.52e+00    1.22e+00      1.72e-01    1.42e-01    9.0e-04
15000   2.14e+00    1.42e+00      1.02e+00    7.60e-01      1.23e-01    9.30e-02    8.6e-04
20000   1.42e+00    8.81e-01      7.42e-01    5.11e-01      9.32e-02    6.60e-02    8.2e-04
30000   8.94e-01    5.02e-01      5.21e-01    3.30e-01      7.10e-02    4.72e-02    7.5e-04
40000   6.55e-01    3.41e-01      4.12e-01    2.44e-01      5.92e-02    3.80e-02    6.8e-04
50000   5.31e-01    2.63e-01      3.55e-01    1.98e-01      5.22e-02    3.28e-02    6.2e-04
60000   4.62e-01    2.20e-01      3.21e-01    1.75e-01      4.81e-02    3.00e-02    5.6e-04
80000   4.01e-01    1.84e-01      2.91e-01    1.54e-01      4.43e-02    2.73e-02    4.7e-04
100000  3.72e-01    1.68e-01      2.76e-01    1.44e-01      4.21e-02    2.61e-02    3.9e-04
120000  3.58e-01    1.60e-01      2.69e-01    1.39e-01      4.12e-02    2.55e-02    3.3e-04
150000  3.50e-01    1.55e-01      2.65e-01    1.36e-01      4.06e-02    2.51e-02    2.6e-04
180000  3.46e-01    1.52e-01      2.63e-01    1.34e-01      4.03e-02    2.49e-02    2.0e-04
200000  3.44e-01    1.51e-01      2.62e-01    1.33e-01      4.02e-02    2.48e-02    1.7e-04
`;

export function LcurveAnalyzer() {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [analyzed, setAnalyzed] = useState(false);
  const [history, setHistory] = useLocalStorage<HistoryEntry[]>(HISTORY_KEY, []);
  const fileRef = useRef<HTMLInputElement>(null);

  const result = useMemo(() => {
    if (!text.trim()) return null;
    const parsed = parseLcurve(text);
    if (parsed.rows.length === 0) return null;
    const { diagnoses, stats } = diagnoseLcurve(parsed.rows);
    return { parsed, diagnoses, stats };
  }, [text]);

  const runAnalysis = useCallback(() => {
    if (!result) return;
    setAnalyzed(true);
    const entry: HistoryEntry = {
      at: new Date().toLocaleString("zh-CN"),
      name: fileName ?? `训练 ${result.stats.steps} 步`,
      steps: result.stats.steps,
      lastValF: result.stats.lastValF,
      summary: result.diagnoses.map((d) => d.title).join("；"),
    };
    const next = [entry, ...history].slice(0, 5);
    setHistory(next);
  }, [result, history, fileName, setHistory]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result ?? ""));
    reader.readAsText(file);
  };

  const seriesF = useMemo(() => {
    if (!result) return [];
    const rows = result.parsed.rows;
    const val = rows.filter((r) => r.valF !== undefined).map((r) => ({ x: r.step, y: r.valF! }));
    const trn = rows.filter((r) => r.trnF !== undefined).map((r) => ({ x: r.step, y: r.trnF! }));
    return [
      val.length ? { name: "力 RMSE (val)", color: "#d97706", points: val } : null,
      trn.length ? { name: "力 RMSE (trn)", color: "#fbbf24", points: trn, dashed: true } : null,
    ].filter(Boolean) as { name: string; color: string; points: { x: number; y: number }[]; dashed?: boolean }[];
  }, [result]);

  const seriesE = useMemo(() => {
    if (!result) return [];
    const rows = result.parsed.rows;
    const val = rows.filter((r) => r.valE !== undefined).map((r) => ({ x: r.step, y: r.valE! }));
    const trn = rows.filter((r) => r.trnE !== undefined).map((r) => ({ x: r.step, y: r.trnE! }));
    return [
      val.length ? { name: "能量 RMSE (val)", color: "#2563eb", points: val } : null,
      trn.length ? { name: "能量 RMSE (trn)", color: "#93c5fd", points: trn, dashed: true } : null,
    ].filter(Boolean) as { name: string; color: string; points: { x: number; y: number }[]; dashed?: boolean }[];
  }, [result]);

  const seriesLr = useMemo(() => {
    if (!result) return [];
    const rows = result.parsed.rows.filter((r) => r.lr !== undefined);
    if (rows.length < 2) return [];
    return [{ name: "学习率", color: "#71717a", points: rows.map((r) => ({ x: r.step, y: r.lr! })) }];
  }, [result]);

  const [logScale, setLogScale] = useState(true);

  return (
    <div className="space-y-6">
      {/* 输入区 */}
      <div className="border border-zinc-200 rounded-xl bg-white p-4">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <label className="text-sm font-medium text-zinc-700">粘贴 lcurve.out 内容：</label>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="px-3 py-1.5 text-xs border border-zinc-300 rounded-lg text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            📁 上传文件
          </button>
          <input ref={fileRef} type="file" accept=".out,.txt,text/plain" onChange={handleFile} className="hidden" />
          {fileName && <span className="text-xs text-zinc-400">{fileName}</span>}
          <button
            type="button"
            onClick={() => {
              setText(EXAMPLE_LCURVE);
              setFileName("示例数据");
            }}
            className="ml-auto px-3 py-1.5 text-xs border border-zinc-300 rounded-lg text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            ✨ 载入示例
          </button>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          spellCheck={false}
          placeholder={"把 lcurve.out 的内容粘贴到这里（支持带 # 表头的格式）\n\n示例：\n# step rmse_val rmse_trn rmse_e_val rmse_e_trn rmse_f_val rmse_f_trn lr\n0 3.41e+01 3.33e+01 ..."}
          className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-xs font-mono leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-zinc-50"
        />
        <div className="flex items-center justify-between mt-3">
          <div className="text-xs text-zinc-400">
            {result
              ? `解析 ${result.parsed.rows.length} 行${result.parsed.warnings.length ? `，${result.parsed.warnings.length} 条解析提示` : ""}`
              : "数据会保留在浏览器本地"}
          </div>
          <button
            type="button"
            onClick={runAnalysis}
            disabled={!result || analyzed}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            分析训练状态
          </button>
        </div>
      </div>

      {/* 诊断结果 */}
      {result && analyzed && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="训练步数" value={`${result.stats.steps}`} />
            <StatCard
              label="力 RMSE (val)"
              value={result.stats.lastValF !== null ? result.stats.lastValF.toExponential(2) : "—"}
            />
            <StatCard
              label="能量 RMSE (val)"
              value={result.stats.lastValE !== null ? result.stats.lastValE.toExponential(2) : "—"}
            />
            <StatCard
              label="状态"
              value={
                result.stats.divergent
                  ? "发散"
                  : result.stats.converged === "yes"
                    ? "已收敛"
                    : result.stats.converged === "rising"
                      ? "回升中"
                      : result.stats.converged === "no"
                        ? "仍在下降"
                        : "—"
              }
              danger={result.stats.divergent}
            />
          </div>

          {/* 诊断列表 */}
          <div className="space-y-2">
            {result.diagnoses.map((d, i) => {
              const style = LEVEL_STYLE[d.level];
              return (
                <div key={i} className={`border rounded-xl bg-white p-4 ${style.card}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.badge}`}>
                      {LEVEL_LABEL[d.level]}
                    </span>
                    <span className="text-sm font-semibold text-zinc-900">{d.title}</span>
                  </div>
                  <p className="text-sm text-zinc-600">{d.detail}</p>
                  {d.suggestion && (
                    <p className="text-sm text-zinc-600 mt-1.5">
                      💡 <span className="text-zinc-700">建议：</span>
                      {d.suggestion}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* 图表 */}
          <div className="border border-zinc-200 rounded-xl bg-white p-4 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-900">训练曲线</h3>
              <label className="flex items-center gap-2 text-xs text-zinc-500">
                <input
                  type="checkbox"
                  checked={logScale}
                  onChange={(e) => setLogScale(e.target.checked)}
                  className="accent-zinc-900"
                />
                对数刻度
              </label>
            </div>
            {seriesF.length > 0 && (
              <div>
                <div className="text-xs text-zinc-400 mb-1">力 RMSE（eV/Å）</div>
                <LineChart series={seriesF} logScale={logScale} xLabel="训练步数" />
              </div>
            )}
            {seriesE.length > 0 && (
              <div>
                <div className="text-xs text-zinc-400 mb-1">能量 RMSE（eV/atom）</div>
                <LineChart series={seriesE} logScale={logScale} xLabel="训练步数" />
              </div>
            )}
            {seriesLr.length > 0 && (
              <div>
                <div className="text-xs text-zinc-400 mb-1">学习率</div>
                <LineChart series={seriesLr} logScale={false} xLabel="训练步数" yFormat={(v) => v.toExponential(1)} />
              </div>
            )}
          </div>

          {/* 解析警告 */}
          {result.parsed.warnings.length > 0 && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
              ⚠️ {result.parsed.warnings.join("；")}
            </div>
          )}
        </>
      )}

      {/* 历史记录 */}
      {history.length > 0 && (
        <div className="border border-zinc-200 rounded-xl bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-zinc-900">📋 最近诊断（本地保存）</h3>
            <button
              type="button"
              onClick={() => setHistory([])}
              className="text-xs text-zinc-400 hover:text-red-500 transition-colors"
            >
              清空
            </button>
          </div>
          <ul className="space-y-1.5">
            {history.map((h, i) => (
              <li key={i} className="text-xs text-zinc-600 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                <span className="text-zinc-400">{h.at}</span>
                <span className="font-medium text-zinc-800">{h.name}</span>
                <span>{h.steps} 步</span>
                {h.lastValF !== null && <span>f={h.lastValF.toExponential(2)}</span>}
                <span className="text-zinc-400 truncate max-w-full">{h.summary}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 提示 */}
      <div className="text-xs text-zinc-400">
        📖 判定标准与调参建议详见知识库文章《lcurve.out 训练曲线解读与异常诊断》（知识库 → DeePMD 训练）；诊断记录仅保存在浏览器本地。
      </div>
    </div>
  );
}

function StatCard({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="border border-zinc-200 rounded-xl bg-white p-3 text-center">
      <div className="text-xs text-zinc-400 mb-1">{label}</div>
      <div className={`text-base font-semibold ${danger ? "text-red-600" : "text-zinc-900"}`}>{value}</div>
    </div>
  );
}
