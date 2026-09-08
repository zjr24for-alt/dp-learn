/**
 * model_devi.out 解析与主动学习诊断（纯逻辑，可在 Node 中测试）
 *
 * DP-GEN model_devi 输出格式（按表头名称解析）：
 * #  step     max_devi_f     min_devi_f     avg_devi_f     max_devi_e     min_devi_e     avg_devi_e
 * 0       3.24e+00       1.85e-01       1.49e+00       2.14e-02       9.26e-04       7.96e-03
 */

export interface ModelDeviRow {
  step: number;
  maxF?: number;
  minF?: number;
  avgF?: number;
  maxE?: number;
  minE?: number;
  avgE?: number;
  extra: Record<string, number>;
}

export interface ModelDeviParseResult {
  rows: ModelDeviRow[];
  columns: string[];
  warnings: string[];
}

function normalizeCol(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[\s_\-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const COLUMN_ALIASES: Record<string, string> = {
  step: "step",
  it: "step",
  iteration: "step",
  max_devi_f: "maxF",
  min_devi_f: "minF",
  avg_devi_f: "avgF",
  max_devi_e: "maxE",
  min_devi_e: "minE",
  avg_devi_e: "avgE",
};

const INTERNAL_FIELDS = ["maxF", "minF", "avgF", "maxE", "minE", "avgE"];

/** 无表头时的回退列顺序（DP-GEN 默认 7 列） */
const FALLBACK_ORDER = ["step", "maxF", "minF", "avgF", "maxE", "minE", "avgE"];

function toNum(v: string): number | null {
  const t = v.trim().toLowerCase();
  if (["nan", "inf", "+inf", "-inf", "infinity", "+infinity", "-infinity"].includes(t)) {
    return Number(t);
  }
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function parseModelDevi(text: string): ModelDeviParseResult {
  const lines = text.split(/\r?\n/);
  const rows: ModelDeviRow[] = [];
  const columns: string[] = [];
  const warnings: string[] = [];

  let headerCols: string[] | null = null;
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith("#")) {
      headerCols = t.replace(/^#+/, "").trim().split(/\s+/).map(normalizeCol);
      break;
    }
  }

  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const parts = t.split(/\s+/);
    const nums = parts.map(toNum);
    if (nums.some((n) => n === null)) continue;

    const row: ModelDeviRow = { step: 0, extra: {} };
    const fields = row as unknown as Record<string, number | undefined>;

    if (headerCols) {
      const len = Math.min(headerCols.length, nums.length);
      for (let i = 0; i < len; i++) {
        const name = headerCols[i];
        const value = nums[i]!;
        if (name === "step") {
          row.step = value;
        } else if (COLUMN_ALIASES[name] && name !== "step") {
          fields[COLUMN_ALIASES[name]] = value;
        } else {
          row.extra[name] = value;
        }
      }
      if (!columns.length) columns.push(...headerCols);
    } else {
      if (nums.length !== FALLBACK_ORDER.length) {
        warnings.push(`无法识别的列数（${nums.length}），该行被跳过`);
        continue;
      }
      nums.forEach((v, i) => {
        if (v === null) return;
        const name = FALLBACK_ORDER[i];
        if (name === "step") row.step = v;
        else if (INTERNAL_FIELDS.includes(name)) fields[name] = v;
        else row.extra[name] = v;
      });
      if (!columns.length) columns.push(...FALLBACK_ORDER);
      warnings.push("未检测到表头，已按默认列顺序解析，请确认列含义");
    }

    rows.push(row);
  }

  return { rows, columns, warnings };
}

// ==================== 诊断 ====================

export type DiagnosisLevel = "ok" | "info" | "warn" | "danger";

export interface Diagnosis {
  level: DiagnosisLevel;
  title: string;
  detail: string;
  suggestion?: string;
}

export interface ModelDeviStats {
  frames: number;
  lastStep: number;
  lastMaxF: number | null;
  lastAvgF: number | null;
  aboveHi: number; // maxF > f_trust_hi 的帧数
  belowLo: number; // maxF < f_trust_lo 的帧数
  hiRatio: number; // 高偏差帧占比
  loRatio: number; // 可信帧占比
  trend: "falling" | "stable" | "rising" | null;
}

export interface ModelDeviOptions {
  fLo: number;
  fHi: number;
}

export function diagnoseModelDevi(
  rows: ModelDeviRow[],
  opts: ModelDeviOptions
): { diagnoses: Diagnosis[]; stats: ModelDeviStats } {
  const diagnoses: Diagnosis[] = [];
  const last = rows[rows.length - 1];

  const stats: ModelDeviStats = {
    frames: rows.length,
    lastStep: last?.step ?? 0,
    lastMaxF: last?.maxF ?? null,
    lastAvgF: last?.avgF ?? null,
    aboveHi: 0,
    belowLo: 0,
    hiRatio: 0,
    loRatio: 0,
    trend: null,
  };

  if (rows.length === 0) {
    return { diagnoses, stats };
  }

  if (rows.length < 5) {
    diagnoses.push({
      level: "info",
      title: "样本较少",
      detail: `共 ${rows.length} 帧，诊断仅供参考。`,
    });
  }

  const { fLo, fHi } = opts;
  if (!(fLo > 0) || !(fHi > fLo)) {
    diagnoses.push({
      level: "warn",
      title: "信任阈值不合法",
      detail: `f_trust_lo=${fLo}，f_trust_hi=${fHi}，应满足 0 < lo < hi。`,
    });
  }

  // 统计 maxF 分布
  const maxFSeries: { step: number; v: number }[] = [];
  for (const r of rows) {
    if (r.maxF !== undefined && Number.isFinite(r.maxF)) {
      maxFSeries.push({ step: r.step, v: r.maxF });
      if (r.maxF > fHi) stats.aboveHi++;
      if (r.maxF < fLo) stats.belowLo++;
    }
  }
  stats.hiRatio = rows.length > 0 ? stats.aboveHi / rows.length : 0;
  stats.loRatio = rows.length > 0 ? stats.belowLo / rows.length : 0;

  // 高偏差比例判断
  if (stats.hiRatio > 0.5) {
    diagnoses.push({
      level: "danger",
      title: "多数结构超出信任上限",
      detail: `${stats.aboveHi}/${rows.length} 帧（${(stats.hiRatio * 100).toFixed(0)}%）max_devi_f > ${fHi}。当前模型对这些结构不可信。`,
      suggestion: "说明候选结构与训练集差异大：应继续主动学习迭代（扩充数据 → 重训），或检查 f_trust 设置是否过严。",
    });
  } else if (stats.hiRatio > 0.2) {
    diagnoses.push({
      level: "warn",
      title: "相当比例结构超出信任上限",
      detail: `${stats.aboveHi}/${rows.length} 帧（${(stats.hiRatio * 100).toFixed(0)}%）max_devi_f > ${fHi}。`,
      suggestion: "模型对这部分结构把握不足，建议继续迭代采样；可先检查这批结构是否与训练分布差异过大。",
    });
  } else if (stats.hiRatio > 0.05) {
    diagnoses.push({
      level: "info",
      title: "少量高偏差候选（正常）",
      detail: `${stats.aboveHi}/${rows.length} 帧（${(stats.hiRatio * 100).toFixed(0)}%）超出上限，属主动学习正常采样范围。`,
    });
  } else {
    diagnoses.push({
      level: "ok",
      title: "几乎全部结构可信",
      detail: `仅 ${stats.aboveHi}/${rows.length} 帧（${(stats.hiRatio * 100).toFixed(0)}%）超出上限 ${fHi}。`,
    });
  }

  // 趋势判断
  if (maxFSeries.length >= 8) {
    const half = Math.floor(maxFSeries.length / 2);
    const mean = (arr: { v: number }[]) => arr.reduce((s, p) => s + p.v, 0) / arr.length;
    const first = mean(maxFSeries.slice(0, half));
    const second = mean(maxFSeries.slice(half));
    if (first > 0) {
      const change = (second - first) / first;
      if (change < -0.2) {
        stats.trend = "falling";
        diagnoses.push({
          level: "ok",
          title: "模型偏差在下降",
          detail: `后半段平均 max_devi_f 比前半段低 ${(Math.abs(change) * 100).toFixed(0)}%，模型在持续改善。`,
        });
      } else if (change > 0.2) {
        stats.trend = "rising";
        diagnoses.push({
          level: "warn",
          title: "模型偏差在上升",
          detail: `后半段平均 max_devi_f 比前半段高 ${(change * 100).toFixed(0)}%。`,
          suggestion: "模型对新探索到的结构把握在下降，可能需要补充数据或调整模型容量。",
        });
      } else {
        stats.trend = "stable";
        diagnoses.push({
          level: "info",
          title: "偏差整体平稳",
          detail: "前后半段平均 max_devi_f 变化在 ±20% 以内。",
        });
      }
    }
  }

  // 收敛判断
  if (stats.hiRatio < 0.05 && stats.loRatio > 0.8 && stats.trend !== "rising") {
    diagnoses.push({
      level: "ok",
      title: "模型已可信，可收敛",
      detail: `${(stats.loRatio * 100).toFixed(0)}% 帧 max_devi_f < ${fLo}，且高偏差帧占比 < 5%。`,
      suggestion: "DP-GEN 迭代可以收敛。若还要继续提升精度，可降低 f_trust 阈值重新标定。",
    });
  }

  return { diagnoses, stats };
}
