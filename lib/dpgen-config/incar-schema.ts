import type { ParamField } from "./param-schema";

export const INCAR_SCHEMA: ParamField[] = [
  {
    key: "PREC",
    label: "计算精度",
    type: "string",
    default: "Accurate",
    description: "VASP 计算精度。Accurate=高精度，Normal=标准",
    required: true,
    enum: ["Accurate", "Normal", "Single"],
  },
  {
    key: "ENCUT",
    label: "截断能",
    type: "number",
    default: "600",
    description: "平面波截断能（eV）。TiC 体系推荐 ≥500 eV。C 的 ENMAX=400eV，建议 1.3~1.5 倍",
    required: true,
  },
  {
    key: "EDIFF",
    label: "电子步收敛判据",
    type: "number",
    default: "1E-6",
    description: "电子自洽迭代的能量收敛标准。1E-6 适合 DP-GEN 标注，1E-7 更精确但更慢",
    required: true,
  },
  {
    key: "GGA",
    label: "交换关联泛函",
    type: "string",
    default: "PE",
    description: "GGA 类型：PE=PBE，91=Perdew-Wang，RP=RPBE",
    required: true,
    enum: ["PE", "91", "RP", "AM", "PS", "CA"],
  },
  {
    key: "ISMEAR",
    label: "展宽类型",
    type: "number",
    default: "1",
    description: "部分占据展宽方法：-5=Tetrahedron, 0=Gaussian, 1=Methfessel-Paxton 1阶, 2=M-P 2阶",
    required: true,
    enum: ["-5", "0", "1", "2"],
  },
  {
    key: "SIGMA",
    label: "展宽宽度",
    type: "number",
    default: "0.1",
    description: "展宽宽度（eV）。金属/导体用 0.1~0.2，半导体用 0.01~0.05",
    required: true,
  },
  {
    key: "IBRION",
    label: "离子优化算法",
    type: "number",
    default: "-1",
    description: "离子运动算法：-1=不移动（静态单点），0=MD，1=RMM-DIIS，2=CG",
    required: true,
    enum: ["-1", "0", "1", "2"],
  },
  {
    key: "NSW",
    label: "离子步数",
    type: "number",
    default: "0",
    description: "离子步数。0=静态计算（DP-GEN FP 标注用），正整数=AIMD步数",
    required: true,
  },
  {
    key: "ISIF",
    label: "应力/弛豫控制",
    type: "number",
    default: "3",
    description: "控制是否弛豫离子位置、晶胞形状和体积。2=只弛豫离子，3=离子+体积+形状",
    required: true,
    enum: ["0", "2", "3", "4", "7"],
  },
  {
    key: "KSPACING",
    label: "K 点间距",
    type: "number",
    default: "0.4",
    description: "布里渊区 K 点采样间距（Å⁻¹）。值越小 k 点越密：64原子 0.4 → ~3×3×3",
    required: true,
  },
  {
    key: "KGAMMA",
    label: "Gamma 中心",
    type: "boolean",
    default: ".TRUE.",
    description: "K 点网格是否以 Gamma 点为中心",
    required: true,
  },
  {
    key: "LREAL",
    label: "实空间投影",
    type: "boolean",
    default: ".FALSE.",
    description: "是否在实空间计算投影算符。.FALSE.=倒空间（高精度），Auto=自动（更快）",
    required: true,
  },
  {
    key: "LWAVE",
    label: "保存 WAVECAR",
    type: "boolean",
    default: ".FALSE.",
    description: "是否保存 WAVECAR 文件。.FALSE. 可节省大量磁盘空间",
    required: true,
  },
  {
    key: "LCHARG",
    label: "保存 CHGCAR",
    type: "boolean",
    default: ".FALSE.",
    description: "是否保存 CHGCAR 电荷密度文件。DP-GEN 标注不需要",
    required: true,
  },
  {
    key: "NELM",
    label: "最大电子步数",
    type: "number",
    default: "200",
    description: "电子自洽迭代的最大步数上限",
    required: false,
  },
  {
    key: "ALGO",
    label: "电子步算法",
    type: "string",
    default: "Normal",
    description: "电子步迭代算法：Normal=标准 blocked-Davidson + CG，VeryFast=仅 CG（更快但可能不稳定）",
    required: false,
    enum: ["Normal", "VeryFast", "Fast", "Damped", "All"],
  },
  {
    key: "NEDOS",
    label: "DOS 点数",
    type: "number",
    default: "",
    description: "DOS 计算的能量点数量（DP-GEN 通常不需要）",
    required: false,
  },
  {
    key: "LORBIT",
    label: "投影态密度",
    type: "number",
    default: "",
    description: "是否计算投影态密度。10=PDOS，11=PDOS+相位（DP-GEN 不需要）",
    required: false,
    enum: ["10", "11"],
  },
];

export function getIncarDefaults(): string {
  return [
    "# ============================================================",
    "# INCAR_fp: TiC 64-atom DFPT 单点标注",
    "# 用于 DP-GEN 主动学习的 DFT 标注",
    "# ============================================================",
    "PREC    = Accurate",
    "ENCUT   = 600",
    "EDIFF   = 1E-6",
    "GGA     = PE",
    "",
    "ISMEAR  = 1",
    "SIGMA   = 0.1",
    "",
    "IBRION  = -1",
    "NSW     = 0",
    "ISIF    = 3",
    "",
    "KSPACING = 0.4",
    "KGAMMA  = .TRUE.",
    "",
    "LREAL   = .FALSE.",
    "LWAVE   = .FALSE.",
    "LCHARG  = .FALSE.",
    "NELM    = 200",
    "ALGO    = Normal",
  ].join("\n");
}

export interface IncarEntry {
  key: string;
  value: string;
  comment?: string;
}

export function parseIncar(text: string): IncarEntry[] {
  const lines = text.split("\n");
  const result: IncarEntry[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#") || trimmed === "") continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const rest = trimmed.slice(eqIdx + 1).trim();
    const commentIdx = rest.indexOf("#");
    const value = commentIdx === -1 ? rest.trim() : rest.slice(0, commentIdx).trim();
    const comment = commentIdx === -1 ? undefined : rest.slice(commentIdx + 1).trim();
    result.push({ key, value, comment });
  }
  return result;
}

export function validateIncar(text: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const entries = parseIncar(text);
  const keys = new Set(entries.map((e) => e.key));

  // Required keys
  const required = ["PREC", "ENCUT", "EDIFF", "KSPACING", "IBRION", "NSW"];
  for (const k of required) {
    if (!keys.has(k)) errors.push(`缺少必需参数: ${k}`);
  }

  // Check INCAR vs DP-GEN requirements
  if (keys.has("NSW") && entries.find((e) => e.key === "NSW")?.value !== "0") {
    errors.push("DP-GEN FP 标注需设 NSW = 0（静态单点）");
  }
  if (keys.has("IBRION") && entries.find((e) => e.key === "IBRION")?.value !== "-1") {
    errors.push("DP-GEN FP 标注需设 IBRION = -1（静态单点）");
  }

  return { valid: errors.length === 0, errors };
}
