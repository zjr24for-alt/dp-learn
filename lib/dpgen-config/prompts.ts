import type { MachineSegment } from "./machine-schema";

/**
 * AI 提问提示词生成器。
 * 用户复制提示词去 chat（matchat 等）提问标准参数，再把答案粘贴回对应配置框。
 */

const COMMON_OUTPUT_JSON = `【输出要求】
1. 最终只输出一个合法 JSON，不要用代码块包裹，不要输出任何解释文字或 markdown
2. 保留我已有的合理设置，标出你新增/修改的字段
3. 每个字段尽量采用官方文档推荐的标准值，不确定时给出文档默认值
4. 若某字段缺失且非必需，可省略`;

export function buildParamPrompt(currentJson: string): string {
  return `你是 DP-GEN (v0.13.2) + DeePMD-kit (v3.1.3) 的配置专家。请参考 DP-GEN 官方文档与 DeePMD 文献中的标准参数，为我生成一份可直接运行的 param.json。

【我的体系与当前草稿】
\`\`\`json
${currentJson}
\`\`\`

【请做】
1. 根据官方文档/文献的标准参数，修正或补全这份 param.json
2. 特别关注：type_map 与 mass_map / model.type_map / descriptor.sel 的长度顺序一致；sel 取偶数并留余量；rcut_smth < rcut；model_devi_f_trust_lo < trust_hi 且取推荐区间；model_devi_jobs 各条 temps/press 长度匹配、npt 必须有 press；fp_style=vasp 所需的 fp_incar/fp_pp_path/fp_pp_files 与 type_map 顺序对应；learning_rate.decay_steps 应远小于 numb_steps
3. 指出我当前配置里可能导致运行失败或精度问题的地方

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

export function buildIncarPrompt(currentIncar: string): string {
  return `你是 VASP 计算专家。请参考 VASP 官方推荐参数与 DP-GEN 主动学习标注的最佳实践，为我生成标准的 INCAR_fp。

【我的体系与当前草稿】
- 材料: Ti-C（金属性），64 原子
- 用途: DP-GEN 第一性原理标注（静态单点，只需能量/力/应力）
\`\`\`
${currentIncar}
\`\`\`

【请做】
1. 按 VASP 标准参数修正/补全这份 INCAR
2. 必须包含：KSPACING（DP-GEN 强制）、KGAMMA=.TRUE.、NSW=0、IBRION=-1（静态单点）、ISIF>=2（输出 virial）、ENCUT >= 1.3×ENMAX（TiC 建议 ≥520 eV）、EDIFF 建议 1E-6
3. 金属体系 ISMEAR=1、SIGMA 0.1~0.2；DP-GEN 标注不需要 DOS，不要加 LORBIT/NEDOS；LCHARG/LWAVE 建议 .FALSE. 省磁盘

【输出要求】
1. 只输出 INCAR 内容（KEY = value 格式），不要用代码块包裹，不要输出解释文字
2. 保留我已有的合理设置，标出你新增/修改的字段`;
}

export function buildLammpsPrompt(currentLammps: string): string {
  return `你是 LAMMPS + DeePMD 势函数运行专家。请参考 LAMMPS 官方文档与 DeePMD-kit 文档，为我生成一份标准 LAMMPS 输入脚本（供 DP-GEN model_devi 探索用）。

【我的体系与当前草稿】
- 材料: Ti-C（type_map: Ti, C）
- 单位制: metal（ps, eV, K, GPa）
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
