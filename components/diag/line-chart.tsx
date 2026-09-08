"use client";

import { useId } from "react";

/**
 * 轻量 SVG 折线图（无第三方依赖）。
 * 支持多序列、对数刻度、自动 nice 刻度、渐变面积填充、端点标记与参考线；
 * 用于 lcurve / model_devi 可视化。
 */
export interface SeriesPoint {
  x: number;
  y: number;
}

export interface Series {
  name: string;
  color: string;
  points: SeriesPoint[];
  dashed?: boolean;
}

export interface ReferenceLine {
  y: number;
  label: string;
  color: string;
}

interface Props {
  series: Series[];
  height?: number;
  logScale?: boolean;
  yLabel?: string;
  xLabel?: string;
  yFormat?: (v: number) => string;
  /** 水平参考线（阈值线） */
  referenceLines?: ReferenceLine[];
}

const W = 720;
const H = 260;
const PAD = { top: 14, right: 14, bottom: 30, left: 58 };

export function LineChart({
  series,
  height = H,
  logScale = false,
  yLabel,
  xLabel,
  yFormat,
  referenceLines = [],
}: Props) {
  const usableW = W - PAD.left - PAD.right;
  const usableH = H - PAD.top - PAD.bottom;
  // 每个图表实例唯一的前缀，避免多张图并存时 SVG 渐变 id 冲突
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const gradId = (si: number) => `grad-${uid}-${si}`;

  // 数据范围
  let xMin = Infinity;
  let xMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;
  const clean: Series[] = [];

  for (const s of series) {
    const pts = s.points.filter(
      (p) => Number.isFinite(p.x) && Number.isFinite(p.y) && p.y > 0
    );
    if (pts.length < 2) continue;
    for (const p of pts) {
      xMin = Math.min(xMin, p.x);
      xMax = Math.max(xMax, p.x);
      const y = logScale ? Math.log10(p.y) : p.y;
      yMin = Math.min(yMin, y);
      yMax = Math.max(yMax, y);
    }
    clean.push({ ...s, points: pts });
  }

  // 参考线也纳入 Y 范围
  for (const rl of referenceLines) {
    const y = logScale ? Math.log10(rl.y) : rl.y;
    yMin = Math.min(yMin, y);
    yMax = Math.max(yMax, y);
  }

  if (clean.length === 0 || !Number.isFinite(xMin)) {
    return (
      <div
        className="flex items-center justify-center text-sm text-zinc-400 border border-zinc-200 rounded-lg"
        style={{ height }}
      >
        数据不足，无法绘图
      </div>
    );
  }

  if (xMax === xMin) xMax = xMin + 1;
  if (yMax === yMin) yMax = yMin + 1;

  const toX = (x: number) => PAD.left + ((x - xMin) / (xMax - xMin)) * usableW;
  const toY = (y: number) => PAD.top + (1 - (y - yMin) / (yMax - yMin)) * usableH;

  // nice 刻度（线性）
  const niceTicks = (min: number, max: number, count: number): number[] => {
    const span = max - min;
    if (span <= 0) return [min];
    const step0 = span / count;
    const mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const norm = step0 / mag;
    const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
    const ticks: number[] = [];
    for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-6; v += step) {
      ticks.push(v);
    }
    return ticks;
  };

  // 对数刻度（仅正数范围）
  const yTicks = logScale
    ? (() => {
        const lo = Math.floor(yMin);
        const hi = Math.ceil(yMax);
        const ticks: number[] = [];
        for (let e = lo; e <= hi; e++) ticks.push(e);
        return ticks;
      })()
    : niceTicks(yMin, yMax, 5);
  const xTicks = niceTicks(xMin, xMax, 5);

  const defaultFmt = (v: number) =>
    logScale ? `1e${v.toFixed(0)}` : v >= 100 || v < 0.01 ? v.toExponential(1) : v.toPrecision(2);
  const fmtY = yFormat ?? defaultFmt;

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto" }}
        role="img"
        aria-label={`折线图${yLabel ? `：${yLabel}` : ""}`}
      >
        {/* 网格与 Y 刻度 */}
        {yTicks.map((t, i) => {
          const y = toY(t);
          return (
            <g key={`y${i}`}>
              <line
                x1={PAD.left}
                y1={y}
                x2={W - PAD.right}
                y2={y}
                stroke="#e4e4e7"
                strokeWidth={1}
              />
              <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize={11} fill="#a1a1aa">
                {fmtY(logScale ? Math.pow(10, t) : t)}
              </text>
            </g>
          );
        })}
        {/* X 刻度 */}
        {xTicks.map((t, i) => (
          <g key={`x${i}`}>
            <line
              x1={toX(t)}
              y1={PAD.top}
              x2={toX(t)}
              y2={H - PAD.bottom}
              stroke="#f4f4f5"
              strokeWidth={1}
            />
            <text x={toX(t)} y={H - PAD.bottom + 16} textAnchor="middle" fontSize={11} fill="#a1a1aa">
              {t >= 1000 ? `${(t / 1000).toFixed(t % 1000 === 0 ? 0 : 1)}k` : `${t}`}
            </text>
          </g>
        ))}

        {/* 参考线 */}
        {referenceLines.map((rl, i) => {
          const y = toY(logScale ? Math.log10(rl.y) : rl.y);
          return (
            <g key={`rl${i}`}>
              <line
                x1={PAD.left}
                y1={y}
                x2={W - PAD.right}
                y2={y}
                stroke={rl.color}
                strokeWidth={1.5}
                strokeDasharray="8 4"
              />
              <text x={W - PAD.right - 4} y={y - 4} textAnchor="end" fontSize={10} fill={rl.color}>
                {rl.label}
              </text>
            </g>
          );
        })}

        {/* 轴线 */}
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom} stroke="#a1a1aa" />
        <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke="#a1a1aa" />

        {/* 渐变定义 */}
        <defs>
          {clean.map((s, si) => (
            <linearGradient key={si} id={gradId(si)} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.16} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>

        {/* 数据序列 */}
        {clean.map((s, si) => {
          const pts = s.points
            .map((p, i) => {
              const x = toX(p.x);
              const y = toY(logScale ? Math.log10(p.y) : p.y);
              return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
            })
            .join(" ");
          const first = s.points[0];
          const last = s.points[s.points.length - 1];
          const lastX = toX(last.x);
          const lastY = toY(logScale ? Math.log10(last.y) : last.y);
          // 渐变面积（仅实线序列；虚线用于对比序列，填充会干扰）
          const area = `${pts} L${lastX.toFixed(1)},${(H - PAD.bottom).toFixed(1)} L${toX(first.x).toFixed(1)},${(H - PAD.bottom).toFixed(1)} Z`;
          return (
            <g key={si}>
              {!s.dashed && <path d={area} fill={`url(#${gradId(si)})`} />}
              <path
                d={pts}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeDasharray={s.dashed ? "6 4" : undefined}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {/* 端点标记 */}
              <circle cx={lastX} cy={lastY} r={3.5} fill={s.color} stroke="#ffffff" strokeWidth={1.5} />
            </g>
          );
        })}

        {/* 轴标签 */}
        {yLabel && (
          <text
            x={14}
            y={PAD.top + usableH / 2}
            fontSize={11}
            fill="#71717a"
            transform={`rotate(-90 14 ${PAD.top + usableH / 2})`}
            textAnchor="middle"
          >
            {yLabel}
          </text>
        )}
        {xLabel && (
          <text
            x={PAD.left + usableW / 2}
            y={H - 6}
            fontSize={11}
            fill="#71717a"
            textAnchor="middle"
          >
            {xLabel}
          </text>
        )}
      </svg>

      {/* 图例 */}
      <div className="flex flex-wrap gap-4 mt-2 text-xs text-zinc-600">
        {clean.map((s, i) => (
          <span key={i} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block w-4 h-0.5 rounded"
              style={{
                background: s.color,
                ...(s.dashed ? { backgroundImage: "repeating-linear-gradient(90deg, currentColor 0 4px, transparent 4px 8px)" } : {}),
              }}
            />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}
