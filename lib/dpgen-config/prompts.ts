import type { MachineSegment } from "./machine-schema";

/**
 * AI 提问提示词生成器。
 * 用户复制提示词去 chat（matchat 等）提问标准参数，再把答案粘贴回对应配置框。
 * 提示词根据配置自动提取的材料信息（元素/温度/系综等）自适应，可附加材料备注。
 */

const COMMON_OUTPUT_JSON = `【输出要求】
1. 最终只输出一个合法 JSON，不要用代码块包裹，不要输出任何解释文字或 markdown
2. 保留我已有的合理设置，标出你新增/修改的字段
3. 每个字段尽量采用官方文档推荐的标准值，不确定时给出文档默认值
4. 若某字段缺失且非必需，可省略`;

/** 从 param.json 自动提取的材料信息 */
export interface ParamContext {
  elements: string[];
  compoundLabel: string; // 如 "Ti-C 二组元"
  tempRange?: string; // 如 "300–1000 K"
  ensembles: string[];
  fpStyle: string;
  numbModels?: number;
  cellType?: string;
  superCell?: number[];
}

export function analyzeParamJson(jsonText: string): ParamContext {
  const empty: ParamContext = { elements: [], compoundLabel: "", ensembles: [], fpStyle: "" };
  let p: Record<string, unknown>;
  try {
    const v = JSON.parse(jsonText);
    if (typeof v !== "object" || v === null || Array.isArray(v)) return empty;
    p = v as Record<string, unknown>;
  } catch {
    return empty;
  }

  const elements = Array.isArray(p.type_map) ? p.type_map.filter((x): x is string => typeof x === "string") : [];
  const compoundLabel = elements.length > 1 ? `${elements.join("-")} ${elements.length} 组元` : elements.join("");

  // model_devi_jobs 温度区间
  let minT: number | undefined;
  let maxT: number | undefined;
  const jobs = Array.isArray(p.model_devi_jobs) ? p.model_devi_jobs : [];
  for (const job of jobs) {
    if (job && typeof job === "object" && Array.isArray((job as Record<string, unknown>).temps)) {
      for (const t of (job as Record<string, unknown>).temps as unknown[]) {
        const n = Number(t);
        if (Number.isFinite(n)) {
          minT = minT === undefined ? n : Math.min(minT, n);
          maxT = maxT === undefined ? n : Math.max(maxT, n);
        }
      }
    }
  }
  const tempRange = minT !== undefined && maxT !== undefined ? `${minT}–${maxT} K` : undefined;

  const ensembles = Array.from(
    new Set(
      jobs
        .filter((j): j is Record<string, unknown> => !!j && typeof j === "object")
        .map((j) => (typeof j.ensemble === "string" ? j.ensemble : ""))
        .filter(Boolean)
    )
  );

  const fpStyle = typeof p.fp_style === "string" ? p.fp_style : "";
  const numbModels = typeof p.numb_models === "number" ? p.numb_models : undefined;

  let cellType: string | undefined;
  let superCell: number[] | undefined;
  if (p.init_bulk && typeof p.init_bulk === "object" && !Array.isArray(p.init_bulk)) {
    const ib = p.init_bulk as Record<string, unknown>;
    if (typeof ib.cell_type === "string") cellType = ib.cell_type;
    if (Array.isArray(ib.super_cell)) superCell = ib.super_cell.filter((x): x is number => typeof x === "number");
  }

  return { elements, compoundLabel, tempRange, ensembles, fpStyle, numbModels, cellType, superCell };
}

function buildSystemLines(ctx: ParamContext, materialNote?: string): string[] {
  const lines: string[] = [];
  if (ctx.compoundLabel) lines.push(`- 材料: ${ctx.compoundLabel}`);
  else lines.push("- 材料: （未检测到 type_map，请在备注中补充）");
  if (ctx.tempRange) lines.push(`- 目标温度区间: ${ctx.tempRange}（来自 model_devi_jobs）`);
  if (ctx.ensembles.length > 0) lines.push(`- MD 系综: ${ctx.ensembles.join(" / ")}`);
  if (ctx.fpStyle) lines.push(`- FP 引擎: ${ctx.fpStyle}`);
  if (ctx.numbModels !== undefined) lines.push(`- 训练模型数: ${ctx.numbModels}`);
  if (ctx.cellType) lines.push(`- init_bulk 初始晶型: ${ctx.cellType}`);
  if (ctx.superCell && ctx.superCell.length > 0) lines.push(`- init_bulk 超胞: [${ctx.superCell.join(", ")}]`);
  if (materialNote && materialNote.trim() !== "") lines.push(`- 材料备注: ${materialNote.trim()}`);
  return lines;
}

export function buildParamPrompt(currentJson: string, materialNote?: string): string {
  const ctx = analyzeParamJson(currentJson);
  const sysLines = buildSystemLines(ctx, materialNote);
  return `你是 DP-GEN (v0.13.2) + DeePMD-kit (v3.1.3) 的配置专家。请参考 DP-GEN 官方文档与 DeePMD 文献中的标准参数，为我生成一份可直接运行的 param.json。

【我的体系】（从当前配置自动提取，请据此调整标准参数）
${sysLines.join("\n")}

【当前 param.json 草稿】
\`\`\`json
${currentJson}
\`\`\`

【请做】
1. 根据官方文档/文献的标准参数，修正或补全这份 param.json
2. 特别关注：type_map 与 mass_map / model.type_map / descriptor.sel 的长度顺序一致；sel 取偶数并留余量；rcut_smth < rcut；model_devi_f_trust_lo < trust_hi 且取推荐区间；model_devi_jobs 各条 temps/press 长度匹配、npt 必须有 press；fp_style=vasp 所需的 fp_incar/fp_pp_path/fp_pp_files 与 type_map 顺序对应；learning_rate.decay_steps 应远小于 numb_steps
3. 若配置了 init_bulk：检查其符合 dpgen init_bulk 规范——from_poscar=true 时必须有 from_poscar_path（cell_type/latt 忽略）；false 时给 cell_type/latt；relax_incar 与 md_incar 应是独立于 INCAR_fp 的弛豫/AIMD INCAR
4. 指出我当前配置里可能导致运行失败或精度问题的地方

${COMMON_OUTPUT_JSON}`;
}

const MACHINE_HINTS: Record<MachineSegment, { desc: string; software: string }> = {
  train: {
    desc: "DeePMD 训练段：通常 batch_type=shell 本地执行或 Slurm，command 调用 dp / dp_wrapper，需要 GPU",
    software: "dp / dp_wrapper",
  },
  model_devi: {
    desc: "model_devi 探索段：command 调用 LAMMPS（lmp），需带 DeePMD 包",
    software: "lmp",
  },
  fp: {
    desc: "VASP 第一性原理标注段：通常 SSH 登录超算 + 调度器（Torque/PBS/Slurm），command 用 mpirun 调 vasp_std，需 remote_profile",
    software: "vasp_std",
  },
};

export function buildMachinePrompt(segment: MachineSegment, currentJson: string): string {
  const hint = MACHINE_HINTS[segment];
  return `你是 DPDispatcher / DP-GEN 的机器配置专家。请参考 DP-GEN 官方文档，为我生成 machine.json 的 ${segment} 段标准配置。

【我的情况与当前草稿】
- 用途: ${hint.desc}
- 对应软件命令: ${hint.software}
\`\`\`json
${currentJson}
\`\`\`

【请做】
1. 根据官方文档修正/补全这份配置，输出 DPDispatcher 数组格式 [{ "machine": {...}, "resources": {...}, "command": "..." }]
2. batch_type / context_type 使用 DP-GEN 官方合法值；context_type=SSH 时必须包含 remote_root 与 remote_profile（hostname/username/key_filename）
3. command 使用 ${hint.software} 的标准调用方式，并包含必要的环境准备（如 source / module load）

${COMMON_OUTPUT_JSON}`;
}

export function buildIncarPrompt(currentIncar: string, paramJson?: string, materialNote?: string): string {
  const ctx = paramJson ? analyzeParamJson(paramJson) : { elements: [], compoundLabel: "", ensembles: [], fpStyle: "" };
  const sysLines = buildSystemLines(ctx, materialNote);
  return `你是 VASP 计算专家。请参考 VASP 官方推荐参数与 DP-GEN 主动学习标注的最佳实践，为 ${ctx.compoundLabel || "我的体系"} 生成标准的 INCAR_fp。

【我的体系】（从 param.json 自动提取，请据此调整）
${sysLines.join("\n")}
- 用途: DP-GEN 第一性原理标注（静态单点，只需能量/力/应力）

【当前 INCAR 草稿】
\`\`\`
${currentIncar}
\`\`\`

【请做】
1. 按 VASP 标准参数修正/补全这份 INCAR
2. 请根据元素判断体系金属/半导体性质，并选择相应的 ISMEAR 与 SIGMA（金属→ISMEAR=1, SIGMA 0.1~0.2；半导体/绝缘体→ISMEAR=0, SIGMA 0.01~0.05）
3. 必须包含：KSPACING（DP-GEN 强制）、KGAMMA=.TRUE.、NSW=0、IBRION=-1（静态单点）、ISIF>=2（输出 virial）、ENCUT >= 1.3×ENMAX、EDIFF 建议 1E-6
4. DP-GEN 标注不需要 DOS，不要加 LORBIT/NEDOS；LCHARG/LWAVE 建议 .FALSE. 省磁盘

【输出要求】
1. 只输出 INCAR 内容（KEY = value 格式），不要用代码块包裹，不要输出解释文字
2. 保留我已有的合理设置，标出你新增/修改的字段`;
}

export function buildLammpsPrompt(currentLammps: string, paramJson?: string, materialNote?: string): string {
  const ctx = paramJson ? analyzeParamJson(paramJson) : { elements: [], compoundLabel: "", ensembles: [], fpStyle: "" };
  const sysLines = buildSystemLines(ctx, materialNote);
  return `你是 LAMMPS + DeePMD 势函数运行专家。请参考 LAMMPS 官方文档与 DeePMD-kit 文档，为 ${ctx.compoundLabel || "我的体系"} 生成一份标准 LAMMPS 输入脚本（供 DP-GEN model_devi 探索用）。

【我的体系】（从 param.json 自动提取，请据此调整）
${sysLines.join("\n")}
- 单位制: metal（ps, eV, K, GPa）

【当前 LAMMPS 草稿】
\`\`\`
${currentLammps || "# 空，将由你生成完整脚本"}
\`\`\`

【请做】
1. 修正/补全这份 LAMMPS 输入，或从零生成一份标准的 DeePMD 势函数 MD 输入
2. 必须包含：units metal、atom_style、read_data 或 include、pair_style deepmd（带模型 .pb 路径）、pair_coeff * *、velocity 初始化（带 seed）、fix nvt/npt、thermo、dump、run 步数
3. timestep 建议 0.001~0.002 ps；NPT 需提供温度和压力控制

【输出要求】
1. 只输出 LAMMPS 输入脚本内容，不要用代码块包裹，不要输出解释文字
2. 保留我已有的合理设置`;
}

export function buildSubmitPrompt(currentSubmit: string): string {
  return `你是超算作业提交脚本专家。请参考 Torque/PBS 与 Slurm 的官方语法，为我生成标准的作业提交脚本。

【我的情况与当前草稿】
- 用途: VASP / LAMMPS 计算作业提交
\`\`\`bash
${currentSubmit || "# 空，将由你生成完整脚本"}
\`\`\`

【请做】
1. 修正/补全这份提交脚本，或从零生成一份标准脚本
2. 必须包含：#!/bin/bash、调度头（#PBS 或 #SBATCH，含节点数与 walltime=HH:MM:SS）、环境加载（module load / source）、并行执行命令（mpirun/mpiexec/srun）
3. 若调用 vasp，建议在 mpirun 前 unset LD_LIBRARY_PATH 避免动态库污染

【输出要求】
1. 只输出脚本内容，不要用代码块包裹，不要输出解释文字
2. 保留我已有的合理设置`;
}
