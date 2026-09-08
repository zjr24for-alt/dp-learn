"use client";

import { useMemo, useRef, useState } from "react";
import { parseModelDevi, diagnoseModelDevi, type DiagnosisLevel } from "@/lib/model-devi";
import { LineChart } from "@/components/diag/line-chart";
import { useLocalStorage } from "@/lib/use-local-storage";

const HISTORY_KEY = "dp-learn-model-devi-history";
const TRUST_KEY = "dp-learn-model-devi-trust";

interface HistoryEntry {
  at: string;
  name: string;
  frames: number;
  hiRatio: number;
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

// 示例：偏差持续下降，多数帧低于 f_trust_hi，少量高偏差候选（正常主动学习状态）
const EXAMPLE = `#  step     max_devi_f     min_devi_f     avg_devi_f     max_devi_e     min_devi_e     avg_devi_e
0       2.80e-01       1.20e-02       1.31e-01       4.80e-02       2.10e-03       1.85e-02
1       2.40e-01       1.10e-02       1.12e-01       4.10e-02       1.90e-03       1.52e-02
2       1.90e-01       9.00e-03       8.90e-02       3.45e-02       1.60e-03       1.21e-02
3       1.60e-01       8.00e-03       7.50e-02       2.91e-02       1.40e-03       9.90e-03
4       1.30e-01       7.00e-03       6.10e-02       2.48e-02       1.20e-03       8.10e-03
5       1.10e-01       6.00e-03       5.20e-02       2.13e-02       1.00e-03       6.70e-03
6       9.00e-02       5.00e-03       4.30e-02       1.86e-02       9.00e-04       5.50e-03
7       7.00e-02       4.00e-03       3.40e-02       1.61e-02       8.00e-04       4.50e-03
8       6.00e-02       4.00e-03       2.90e-02       1.42e-02       7.00e-04       3.70e-03
9       5.00e-02       3.00e-03       2.40e-02       1.27e-02       6.00e-04       3.20e-03
10      4.00e-02       3.00e-03       1.90e-02       1.14e-02       5.00e-04       2.70e-03
`;

export function ModelDeviAnalyzer() {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [analyzed, setAnalyzed] = useState(false);
  const [fLo, setFLo] = useLocalStorage<number>(`${TRUST_KEY}:flo`, 0.05);
  const [fHi, setFHi] = useLocalStorage<number>(`${TRUST_KEY}:fhi`, 0.2);
  const [history, setHistory] = useLocalStorage<HistoryEntry[]>(HISTORY_KEY, []);
  const fileRef = useRef<HTMLInputElement>(null);

  const result = useMemo(() => {
    if (!text.trim()) return null;
    const parsed = parseModelDevi(text);
    if (parsed.rows.length === 0) return null;
    const { diagnoses, stats } = diagnoseModelDevi(parsed.rows, { fLo, fHi });
    return { parsed, diagnoses, stats };
  }, [text, fLo, fHi]);

  const runAnalysis = () => {
    if (!result) return;
    setAnalyzed(true);
    const entry: HistoryEntry = {
      at: new Date().toLocaleString("zh-CN"),
      name: fileName ?? `迭代 ${result.stats.frames} 帧`,
      frames: result.stats.frames,
      hiRatio: result.stats.hiRatio,
      summary: result.diagnoses.map((d) => d.title).join("；"),
    };
    setHistory([entry, ...history].slice(0, 5));
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result ?? ""));
    reader.readAsText(file);
  };

  const chartSeries = useMemo(() => {
    if (!result) return [];
    const rows = result.parsed.rows;
    return [
      {
        name: "max_devi_f",
        color: "#dc2626",
        points: rows.filter((r) => r.maxF !== undefined).map((r) => ({ x: r.step, y: r.maxF! })),
      },
      {
        name: "avg_devi_f",
        color: "#f59e0b",
        dashed: true,
        points: rows.filter((r) => r.avgF !== undefined).map((r) => ({ x: r.step, y: r.avgF! })),
      },
    ];
  }, [result]);

  return (
    <div className="space-y-6">
      {/* 输入区 */}
      <div className="border border-zinc-200 rounded-xl bg-white p-4">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <label className="text-sm font-medium text-zinc-700">粘贴 model_devi.out 内容：</label>
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
              setText(EXAMPLE);
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
          rows={8}
          spellCheck={false}
          placeholder={"把 model_devi.out 的内容粘贴到这里\n\n示例：\n# step max_devi_f min_devi_f avg_devi_f max_devi_e min_devi_e avg_devi_e\n0 1.86e+00 6.20e-02 6.41e-01 ..."}
          className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-xs font-mono leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-zinc-50"
        />
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          <label className="flex items-center gap-2 text-xs text-zinc-600">
            f_trust_lo
            <input
              type="number"
              step="0.01"
              value={fLo}
              onChange={(e) => setFLo(Number(e.target.value))}
              className="w-20 px-2 py-1 border border-zinc-300 rounded-md text-xs"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-zinc-600">
            f_trust_hi
            <input
              type="number"
              step="0.05"
              value={fHi}
              onChange={(e) => setFHi(Number(e.target.value))}
              className="w-20 px-2 py-1 border border-zinc-300 rounded-md text-xs"
            />
          </label>
          <div className="text-xs text-zinc-400">
            DP-GEN 默认 0.05 / 0.20（max_devi_f，单位 eV/Å）
          </div>
          <button
            type="button"
            onClick={runAnalysis}
            disabled={!result || analyzed}
            className="ml-auto px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            分析模型偏差
          </button>
        </div>
      </div>

      {/* 结果 */}
      {result && analyzed && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="帧数" value={`${result.stats.frames}`} />
            <Stat
              label="末帧 max_devi_f"
              value={result.stats.lastMaxF !== null ? result.stats.lastMaxF.toExponential(2) : "—"}
            />
            <Stat
              label="超出上限占比"
              value={`${(result.stats.hiRatio * 100).toFixed(1)}%`}
              danger={result.stats.hiRatio > 0.2}
            />
            <Stat
              label="低于下限占比"
              value={`${(result.stats.loRatio * 100).toFixed(1)}%`}
            />
          </div>

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

          <div className="border border-zinc-200 rounded-xl bg-white p-4">
            <div className="text-xs text-zinc-400 mb-1">max_devi_f 随迭代变化（虚线为 f_trust 阈值）</div>
            <LineChart
              series={chartSeries}
              logScale
              xLabel="迭代步"
              yLabel="devi_f (eV/Å)"
              referenceLines={[
                { y: fLo, label: `lo ${fLo}`, color: "#22c55e" },
                { y: fHi, label: `hi ${fHi}`, color: "#ef4444" },
              ]}
            />
          </div>

          {result.parsed.warnings.length > 0 && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
              ⚠️ {result.parsed.warnings.join("；")}
            </div>
          )}
        </>
      )}

      {/* 历史 */}
      {history.length > 0 && (
        <div className="border border-zinc-200 rounded-xl bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-zinc-900">📋 最近诊断（本地保存）</h3>
            <button type="button" onClick={() => setHistory([])} className="text-xs text-zinc-400 hover:text-red-500 transition-colors">
              清空
            </button>
          </div>
          <ul className="space-y-1.5">
            {history.map((h, i) => (
              <li key={i} className="text-xs text-zinc-600 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                <span className="text-zinc-400">{h.at}</span>
                <span className="font-medium text-zinc-800">{h.name}</span>
                <span>{h.frames} 帧</span>
                <span className={h.hiRatio > 0.2 ? "text-red-500" : ""}>超限 {(h.hiRatio * 100).toFixed(0)}%</span>
                <span className="text-zinc-400 truncate max-w-full">{h.summary}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="text-xs text-zinc-400">
        📖 判定标准参考知识库文章《模型偏差与 candidate 健康判断》与《DP-GEN 常用检查指令》；阈值默认取 DP-GEN 惯例（f_trust 0.05/0.20），可按体系调整。
      </div>
    </div>
  );
}

function Stat({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="border border-zinc-200 rounded-xl bg-white p-3 text-center">
      <div className="text-xs text-zinc-400 mb-1">{label}</div>
      <div className={`text-base font-semibold ${danger ? "text-red-600" : "text-zinc-900"}`}>{value}</div>
    </div>
  );
}
