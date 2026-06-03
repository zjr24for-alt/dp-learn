import type { Article } from "@/lib/types";

/** 来源: deepmodeling/tutorials + likefallwind/tutorials */
export const dpgenHandsonArticles: Article[] = [
  {
    slug: "dpgen-practical-guidelines",
    title: "DP-GEN 实战指南：从参数配置到收敛判断",
    category: "dpgen-workflow",
    summary: "DP-GEN 主动学习的核心概念、参数设置策略、模型偏差解读与收敛判断（来源：deepmodeling/tutorials）",
    tags: ["dpgen", "主动学习", "模型偏差", "收敛"],
    sourceFiles: ["deepmodeling/tutorials"],
    content: `# DP-GEN 实战指南

## 核心思想

DP-GEN 做一件事：**用最少的 DFT 计算训练出覆盖最广构型空间的势函数**。它通过主动学习闭环实现：

> 当前模型 → MD 探索未知构型 → 模型不确定的构型挑出来 → DFT 重算 → 加入训练集 → 下一轮

## 构型空间与采样

### 为什么需要主动学习
- DFT 计算昂贵（一个 100 原子体系可能耗费数百核时）
- 分子动力学轨迹只覆盖相空间极小一部分
- 手工挑选训练构型依赖经验，容易遗漏关键区域

### DP-GEN 的解决方案
- **exploration**：用 committee model（4 个模型独立训练）做 MD，模型间分歧大的构型 = 模型不确定
- **labeling**：只对不确定构型做 DFT 标注
- **training**：新数据加入训练集，模型能力提升

## 参数设置策略

### model_devi 关键参数

| 参数 | 推荐值 | 说明 |
|------|--------|------|
| model_devi_f_trust_lo | 0.05 ~ 0.15 eV/Å | 低于此值认为模型可靠，跳过标注 |
| model_devi_f_trust_hi | 0.30 ~ 0.50 eV/Å | 高于此值认为模型完全不靠谱，直接丢弃（避免标注浪费） |
| model_devi_e_trust_lo | 0.01 ~ 0.05 eV | 能量偏差下界 |
| model_devi_e_trust_hi | 0.20 ~ 0.50 eV | 能量偏差上界 |
| model_devi_numb_models | 4 | committee 模型数，通常 4（不同随机种子） |
| model_devi_dt_freq | 10 | 每多少 MD 步计算一次偏差（越大越快但可能漏掉快过程） |

> **调参口诀**：trust_lo 控"漏选"（太低 → 标注太多），trust_hi 控"误选"（太高 → 标注质量差）。先用默认值跑一轮，看 candidate 比例再微调。

### 如何判断参数合理

1. **candidate 比例**：每轮 model_devi 筛选后，trust_lo < deviation < trust_hi 的构型占总探索构型的 **5% ~ 20%** 是健康范围
   - \`< 5%\`：模型已经很好，或 trust_lo 太低
   - \`> 30%\`：模型不够好，或 trust_hi 太高，标注负担太重
2. **收敛标志**：连续 2-3 轮 candidate 比例下降且模型偏差不再降低
3. **final model 测试**：在独立测试集上的 energy RMSE < 1 meV/atom，force RMSE < 0.1 eV/Å

### 训练参数建议

| 参数 | 初训 | 增量训练 | 说明 |
|------|------|---------|------|
| numb_steps | 400k ~ 800k | 200k ~ 400k | 初期需要更多步数学习基础 |
| start_lr | 1e-3 | 5e-4 | 增量训练从更低学习率起步（避免破坏已学好的权重） |
| decay_steps | 2000 ~ 5000 | 2000 | 指数衰减，越大学习率下降越慢 |
| stop_batch | 400k | 400k | 总步数与 numb_steps 对齐 |

> **初训 vs 增量训练**：第一轮数据少但需要学广，步数多、学习率高；后续轮次数据增量加入，步数可减少、学习率降低以精细调整。

## 常见问题排查

### 1. model_devi.out 中 deviation 全是 0
- 检查 committee model 是否用了不同随机种子初始化
- 确认 \`numb_models\` > 1
- 所有模型可能坍塌到同一局部最优

### 2. candidate 比例始终 < 1%
- trust_lo 设得太高，尝试降到 0.02
- 初始训练数据已经覆盖得很好 → 试着提高温度拓宽 MD 探索范围
- 体系本身太简单（如纯金属 fcc），考虑直接训练

### 3. 迭代不收敛
- 增加每轮的 MD 步数（nsteps）
- 提高 MD 温度使探索更广泛
- 检查 VASP 计算是否正常（OUTCAR 能量合理）
- 考虑添加结构扰动生成更多初始构型`,
  },
  {
    slug: "dpgen-param-json-reference",
    title: "DP-GEN param.json 关键参数速查",
    category: "dpgen-workflow",
    summary: "param.json 中 model_devi、fp、training 块的核心参数含义与推荐值",
    tags: ["dpgen", "param.json", "参数配置", "VASP"],
    sourceFiles: ["deepmodeling/dpgen"],
    content: `# DP-GEN param.json 关键参数速查

## type_map
\`\`\`json
"type_map": ["Ti", "C"]
\`\`\`
- 元素列表，决定 training data 中原子类型的编码顺序
- **AI 提示**：type_map 顺序影响 DeePMD 训练时 type.raw 的映射，保持一致！(来源: DP-GEN 文档)

## model_devi 块

\`\`\`json
"model_devi_f_trust_lo": 0.10,  // 力偏差下界 (eV/Å)，低于此值：准确，跳过
"model_devi_f_trust_hi": 0.40,  // 力偏差上界 (eV/Å)，高于此值：不准，丢弃
"model_devi_e_trust_lo": 0.02,  // 能量偏差下界 (eV)
"model_devi_e_trust_hi": 0.20,  // 能量偏差上界 (eV)
"model_devi_numb_models": 4,    // committee 模型数，通常 4
"model_devi_dt_freq": 10        // 每多少 MD 步计算一次偏差
\`\`\`

## fp (First-Principles) 块

\`\`\`json
"fp_style": "vasp",
"fp_task_max": 200,      // 单轮最大 VASP 任务数
"fp_task_min": 5,        // 单轮最小 VASP 任务数（低于此数终止迭代）
"fp_incar": "INCAR_fp",  // VASP INCAR 模板路径
"fp_pp_path": "./",      // 赝势目录
"fp_pp_files": ["POTCAR_Ti", "POTCAR_C"]
\`\`\`

- **AI 提示**：fp_task_max 控制每轮 DFT 成本，200 是经验安全值(来源: DP-GEN 实战教程)

## INCAR 模板要点

\`\`\`text
ISIF   = 2      # 只优化原子位置，不改变晶胞
ISMEAR = 0      # 半导体/绝缘体用 Gaussian smearing
SIGMA  = 0.05   # smearing 宽度
ENCUT  = 520    # 截断能 (eV)，至少为 POTCAR ENMAX 的 1.3 倍
EDIFF  = 1E-6   # 电子收敛标准
EDIFFG = -0.02  # 离子弛豫力收敛标准 (eV/Å)
\`\`\`

- **AI 注意**：ENCUT 一定要设对！TiC 体系建议 ≥ 520 eV (来源: VASP 文档)
- **AI 注意**：ISIF = 2 是 DP-GEN 最常用设置，因为只关心原子位置不关心晶胞变化 (来源: DP-GEN 实战)`,
  },
];
