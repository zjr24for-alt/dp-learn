/**
 * lcurve.out 解析与训练诊断（纯逻辑，无 DOM 依赖，可在 Node 中测试）
 *
 * 兼容的列格式（按表头名称解析，常见两种都会命中）：
 * - 本站文档格式：step rmse_val rmse_trn rmse_e_val rmse_e_trn rmse_f_val rmse_f_trn lr
 * - DeePMD-kit 默认：step rmse_trn rmse_val rmse_trn_e rmse_trn_f rmse_trn_v rmse_val_e rmse_val_f rmse_val_v
 * - 带 type 嵌入的额外列（如 rmse_trn_e2）会保留到 extra 中
 */

export interface LcurveRow {
  step: number;
  trn?: number; // 总损失（训练）
  val?: number; // 总损失（验证）
  trnE?: number;
  trnF?: number;
  trnV?: number;
  valE?: number;
  valF?: number;
  valV?: number;
  lr?: number;
  /** 未识别的数值列（含 type 后缀列），键为归一化列名 */
  extra: Record<string, number>;
}

export interface LcurveParseResult {
  rows: LcurveRow[];
  columns: string[];
  warnings: string[];
}

/** 列名归一化：小写、空白/下划线/连字符统一、去首尾分隔符 */
function normalizeCol(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[\s_\-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** 常见列名 → 内部字段（同时兼容 val/trn 先后两种命名） */
const COLUMN_ALIASES: Record<string, string> = {
  step: "step",
  it: "step",
  iteration: "step",
  rmse_trn: "trn",
  rmse_val: "val",
  rmse_trn_e: "trnE",
  rmse_e_trn: "trnE",
  rmse_trn_f: "trnF",
  rmse_f_trn: "trnF",
  rmse_trn_v: "trnV",
  rmse_v_trn: "trnV",
  rmse_val_e: "valE",
  rmse_e_val: "valE",
  rmse_val_f: "valF",
  rmse_f_val: "valF",
  rmse_val_v: "valV",
  rmse_v_val: "valV",
  lr: "lr",
  learning_rate: "lr",
};

/** 无表头时的回退列顺序（按列数猜测） */
const FALLBACK_ORDERS: Record<number, string[]> = {
  8: ["step", "val", "trn", "valE", "trnE", "valF", "trnF", "lr"], // 本站文档格式
  9: ["step", "trn", "val", "trnE", "trnF", "trnV", "valE", "valF", "valV"], // DeePMD-kit 默认
};

/** 内部字段名（无表头回退时直接按此设置） */
const INTERNAL_FIELDS = ["trn", "val", "trnE", "trnF", "trnV", "valE", "valF", "valV", "lr"];

function toNum(v: string): number | null {
  const t = v.trim().toLowerCase();
  // 显式识别 nan / inf 记号：保留在数据中用于发散检测（而不是当垃圾行跳过）
  if (["nan", "inf", "+inf", "-inf", "infinity", "+infinity", "-infinity"].includes(t)) {
    return Number(t);
  }
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function parseLcurve(text: string): LcurveParseResult {
  const lines = text.split(/\r?\n/);
  const rows: LcurveRow[] = [];
  const columns: string[] = [];
  const warnings: string[] = [];

  // 1. 找表头（第一个以 # 开头的行）
  let headerCols: string[] | null = null;
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith("#")) {
      const names = t.replace(/^#+/, "").trim().split(/\s+/);
      headerCols = names.map(normalizeCol);
      break;
    }
  }

  // 2. 解析数据行
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const parts = t.split(/\s+/);
    const nums = parts.map(toNum);
    if (nums.some((n) => n === null)) continue; // 跳过非数值行

    const row: LcurveRow = { step: 0, extra: {} };

    if (headerCols) {
      // 按表头命名
      const len = Math.min(headerCols.length, nums.length);
      for (let i = 0; i < len; i++) {
        const name = headerCols[i];
        const value = nums[i]!;
        applyColumn(row, name, value);
      }
      if (!columns.length) columns.push(...headerCols);
    } else {
      // 无表头：按列数猜测
      const order = FALLBACK_ORDERS[nums.length];
      if (!order) {
        warnings.push(`无法识别的列数（${nums.length} 列），该行被跳过`);
        continue;
      }
      nums.forEach((v, i) => {
        if (v !== null) applyColumn(row, order[i], v);
      });
      if (!columns.length) columns.push(...order);
      warnings.push("未检测到表头，已按默认列顺序解析，请确认列含义");
    }

    rows.push(row);
  }

  return { rows, columns, warnings };
}

function applyColumn(row: LcurveRow, normalized: string, value: number): void {
  const fields = row as unknown as Record<string, number | undefined>;
  if (normalized === "step") {
    row.step = value;
    return;
  }
  const alias = COLUMN_ALIASES[normalized];
  if (alias) {
    fields[alias] = value;
    return;
  }
  if (INTERNAL_FIELDS.includes(normalized)) {
    fields[normalized] = value;
    return;
  }
  // type 后缀列：rmse_trn_e2 → trnE2 等
  const m = normalized.match(/^rmse_(trn|val)_(e|f|v)(\d+)$/);
  if (m) {
    const key = `${m[1] === "trn" ? "trn" : "val"}${m[2].toUpperCase()}${m[3]}`;
    row.extra[key] = value;
    return;
  }
  // 其他数值列保留
  row.extra[normalized] = value;
}

// ==================== 诊断 ====================

export type DiagnosisLevel = "ok" | "info" | "warn" | "danger";

export interface Diagnosis {
  level: DiagnosisLevel;
  title: string;
  detail: string;
  suggestion?: string;
}

export interface LcurveStats {
  steps: number;
  lastStep: number;
  lastValF: number | null;
  lastValE: number | null;
  lastValV: number | null;
  lastTrnF: number | null;
  minValF: number | null;
  minValE: number | null;
  hasNaN: boolean;
  divergent: boolean;
  converged: "yes" | "no" | "rising" | null;
  overfitting: boolean;
}

/** 取序列在指定比例位置的数值（线性插值） */
function valueAt(series: { step: number; v: number }[], fraction: number): number | null {
  if (series.length === 0) return null;
  const target = series[0].step + (series[series.length - 1].step - series[0].step) * fraction;
  let prev = series[0];
  for (const p of series) {
    if (p.step >= target) {
      if (p.step === prev.step) return p.v;
      const t = (target - prev.step) / (p.step - prev.step);
      return prev.v + (p.v - prev.v) * t;
    }
    prev = p;
  }
  return series[series.length - 1].v;
}

export function diagnoseLcurve(rows: LcurveRow[]): {
  diagnoses: Diagnosis[];
  stats: LcurveStats;
} {
  const diagnoses: Diagnosis[] = [];
  const last = rows[rows.length - 1];
  const steps = rows.length;

  const stats: LcurveStats = {
    steps,
    lastStep: last?.step ?? 0,
    lastValF: last?.valF ?? null,
    lastValE: last?.valE ?? null,
    lastValV: last?.valV ?? null,
    lastTrnF: last?.trnF ?? null,
    minValF: null,
    minValE: null,
    hasNaN: false,
    divergent: false,
    converged: null,
    overfitting: false,
  };

  if (rows.length === 0) {
    return { diagnoses, stats };
  }

  // ---- 数据量与 NaN ----
  if (rows.length < 10) {
    diagnoses.push({
      level: "info",
      title: "样本较少",
      detail: `共 ${rows.length} 行数据，诊断结论仅供参考。`,
    });
  }

  const numericKeys = ["trn", "val", "trnE", "trnF", "trnV", "valE", "valF", "valV", "lr"] as const;
  let nanCount = 0;
  for (const r of rows) {
    for (const k of numericKeys) {
      const v = r[k];
      if (v !== undefined && (Number.isNaN(v) || !Number.isFinite(v))) nanCount++;
    }
  }
  if (nanCount > 0) {
    stats.hasNaN = true;
    diagnoses.push({
      level: "danger",
      title: "训练发散（NaN/Inf）",
      detail: `检测到 ${nanCount} 个 NaN/Inf 值。通常意味着训练已发散。`,
      suggestion:
        "优先检查：① 学习率是否过大（建议 start_lr 从 0.001 降低到 0.0005 并加 warm-up）；② 训练数据中是否有异常帧（力 > 50 eV/Å 的帧建议剔除）；③ 网络初始化或数据预处理。",
    });
  }

  // ---- 主序列选择：力 RMSE 优先，其次总损失 ----
  const series: { step: number; v: number }[] = [];
  for (const r of rows) {
    const v = r.valF ?? r.val ?? r.trnF ?? r.trn;
    if (v !== undefined && Number.isFinite(v)) series.push({ step: r.step, v });
  }
  const seriesLabel = last?.valF !== undefined ? "力 RMSE" : "总损失";

  if (series.length >= 5) {
    // 最小值（跳过最前 10% 避免初始尖峰）
    const fromIdx = Math.floor(series.length * 0.1);
    let min = Infinity;
    for (let i = fromIdx; i < series.length; i++) min = Math.min(min, series[i].v);
    stats.minValF = min;

    const lastV = series[series.length - 1].v;
    const vAt80 = valueAt(series, 0.8);

    // 发散：末值远超历史最小值
    if (min > 0 && lastV > 5 * min) {
      stats.divergent = true;
      diagnoses.push({
        level: "danger",
        title: `${seriesLabel} 发散/剧烈反弹`,
        detail: `当前值 ${fmt(lastV)} 已是最小值 ${fmt(min)} 的 ${(lastV / min).toFixed(1)} 倍。`,
        suggestion:
          "检查：① 学习率过大；② 数据中出现异常帧；③ 训练后期数据分布突变。可尝试降低学习率、剔除异常帧后重新训练。",
      });
    }

    // 收敛性
    if (vAt80 !== null && vAt80 > 0) {
      const ratio = lastV / vAt80;
      if (ratio < 0.9) {
        stats.converged = "no";
        diagnoses.push({
          level: "ok",
          title: "仍在下降，建议继续训练",
          detail: `最后 20% 步数内 ${seriesLabel} 从 ${fmt(vAt80)} 降到 ${fmt(lastV)}（下降 ${((1 - ratio) * 100).toFixed(0)}%）。`,
        });
      } else if (ratio <= 1.05) {
        stats.converged = "yes";
        const up = ratio > 1 ? `（略有回升 ${((ratio - 1) * 100).toFixed(1)}%）` : "";
        diagnoses.push({
          level: ratio > 1 ? "warn" : "ok",
          title: ratio > 1 ? "基本收敛，但有轻微回升" : "已基本收敛",
          detail: `最后 20% 步数内 ${seriesLabel} 变化幅度 ${((ratio - 1) * 100).toFixed(1)}%${up}。`,
          suggestion:
            ratio > 1
              ? "轻微回升通常来自学习率衰减末段的噪声，可观察后续走向；若持续上升则按发散处理。"
              : undefined,
        });
      } else {
        stats.converged = "rising";
        diagnoses.push({
          level: "warn",
          title: "训练后期出现回升",
          detail: `最后 20% 步数内 ${seriesLabel} 从 ${fmt(vAt80)} 升到 ${fmt(lastV)}（+${((ratio - 1) * 100).toFixed(0)}%）。`,
          suggestion: "可能原因：过拟合、数据分布变化或学习率策略问题。建议增加数据、减小 numb_steps、或检查学习率衰减配置。",
        });
      }
    }

    // 过拟合：val 明显高于 trn 且差距扩大
    const trnSeries: { step: number; v: number }[] = [];
    for (const r of rows) {
      const v = r.trnF ?? r.trn;
      if (v !== undefined && Number.isFinite(v)) trnSeries.push({ step: r.step, v });
    }
    if (trnSeries.length >= 5 && trnSeries.length >= series.length * 0.5) {
      const gapNow = lastV - trnSeries[trnSeries.length - 1].v;
      const gapAt80 = valueAt(series, 0.8)! - valueAt(trnSeries, 0.8)!;
      if (lastV > 1.5 * trnSeries[trnSeries.length - 1].v && gapNow > gapAt80) {
        stats.overfitting = true;
        diagnoses.push({
          level: "warn",
          title: "疑似过拟合",
          detail: `验证集 ${seriesLabel} ${fmt(lastV)} 明显高于训练集 ${fmt(trnSeries[trnSeries.length - 1].v)}（1.${Math.round((lastV / trnSeries[trnSeries.length - 1].v) * 10)} 倍）且差距在扩大。`,
          suggestion: "增加训练数据、减少 numb_steps、或给网络加 dropout（deepmd-kit 2.x 支持 seed/残差外可配 type embedding 的 attn 层正则）。",
        });
      }
    }
  }

  // ---- 质量分级 ----
  const grade = (v: number, good: number, ok: number, accept: number): string =>
    v < good ? "优秀" : v < ok ? "良好" : v < accept ? "可接受" : "需优化";

  if (last?.valF !== undefined && Number.isFinite(last.valF)) {
    const g = grade(last.valF, 0.05, 0.1, 0.2);
    const level: DiagnosisLevel = g === "需优化" ? "warn" : g === "可接受" ? "info" : "ok";
    diagnoses.push({
      level,
      title: `力 RMSE（验证集）：${g}`,
      detail: `最终 rmse_f_val = ${fmt(last.valF)} eV/Å（<0.05 优秀 / <0.1 良好 / <0.2 可接受）。`,
      suggestion:
        g === "需优化"
          ? "建议：① 增大训练数据量并检查数据质量（DFT 是否收敛）；② 增大 embedding_net（如 [25,50,100] → [50,100,200]）；③ 减小 batch_size；④ 检查 start_pref_f 权重。"
          : undefined,
    });
  }
  if (last?.valE !== undefined && Number.isFinite(last.valE)) {
    const g = grade(last.valE, 0.01, 0.02, 0.05);
    const level: DiagnosisLevel = g === "需优化" ? "warn" : g === "可接受" ? "info" : "ok";
    diagnoses.push({
      level,
      title: `能量 RMSE（验证集）：${g}`,
      detail: `最终 rmse_e_val = ${fmt(last.valE)} eV/atom（<0.01 优秀 / <0.02 良好 / <0.05 可接受）。`,
    });
  }
  if (last?.valV !== undefined && Number.isFinite(last.valV)) {
    const g = grade(last.valV, 0.05, 0.1, 0.2);
    const level: DiagnosisLevel = g === "需优化" ? "warn" : g === "可接受" ? "info" : "ok";
    diagnoses.push({
      level,
      title: `维里 RMSE（验证集）：${g}`,
      detail: `最终 rmse_v_val = ${fmt(last.valV)}（<0.05 优秀 / <0.1 良好 / <0.2 可接受）。`,
    });
  }

  // ---- 能量-力失衡 ----
  if (
    last?.valE !== undefined &&
    last?.valF !== undefined &&
    last.valE < 0.02 &&
    last.valF >= 0.15
  ) {
    diagnoses.push({
      level: "warn",
      title: "能量与力的精度失衡",
      detail: `能量 RMSE 已很好（${fmt(last.valE)}）但力 RMSE 偏高（${fmt(last.valF)}）。`,
      suggestion: "力的损失权重不足：增大 start_pref_f（如 1000 → 2000），或提高数据中力信息的占比。",
    });
  }

  // ---- 学习率 sanity ----
  let lrRise = 0;
  let prevLr: number | null = null;
  for (const r of rows) {
    if (r.lr !== undefined && Number.isFinite(r.lr)) {
      if (prevLr !== null && r.lr > prevLr * 1.01) lrRise++;
      prevLr = r.lr;
    }
  }
  if (lrRise > 0) {
    diagnoses.push({
      level: "info",
      title: "学习率出现上升",
      detail: `检测到 ${lrRise} 处学习率上升，通常不符合 decay 预期，请确认配置（decay_rate / decay_steps）。`,
    });
  }

  return { diagnoses, stats };
}

function fmt(v: number): string {
  if (v === 0) return "0";
  if (Math.abs(v) >= 100 || Math.abs(v) < 0.001) return v.toExponential(2);
  return v.toPrecision(3);
}
