import type { Article } from "@/lib/types";

export const deepmdTrainingArticles: Article[] = [
  {
    slug: "deepmd-training-params",
    title: "DeePMD 训练参数详解",
    category: "deepmd-training",
    summary: "TiC MLP 项目的完整训练参数配置（descriptor、fitting_net、学习率、batch_size 等）",
    content: `# DeePMD 训练参数详解

## 模型参数

| 参数 | 值 | 说明 |
|------|-----|------|
| numb_models | 4 | committee model 数量 |
| numb_steps | 400,000 | 总训练步数 |
| type_map | Ti, C | 元素类型 |
| mass_map | 47.867, 12.011 | 原子质量 |

## 网络结构

### Descriptor: se_e2_a
| 参数 | 值 | 说明 |
|------|-----|------|
| neuron | [25, 50, 100] | 嵌入网络每层神经元 |
| axis_neuron | 16 | 轴神经元数 |
| rcut | 6.5 Å | 截断半径 |
| rcut_smth | 5.0 Å | 平滑截断起点 |
| sel | [40, 40] | 每种元素的最大近邻数 |

### Fitting Net
| 参数 | 值 |
|------|-----|
| neuron | [120, 120, 120] |

## 学习率策略

| 参数 | 值 | 说明 |
|------|-----|------|
| type | exp | 指数衰减 |
| start_lr | 0.001 | 初始学习率 |
| stop_lr | 1e-8 | 终止学习率 |
| decay_steps | 50,000 | 衰减步数 |

学习率变化：\`lr = start_lr * exp(-step / decay_steps)\`

## 训练数据

- TiC 216 原子体系（108 Ti + 108 C）
- 共 3311 帧
- 300K (1645帧) + 1000K (486帧) + 3000K (1180帧)
- batch_size: auto（DeePMD 自动选择）

## Committee Model 策略

训练 4 个独立模型（不同初始化），在 model_devi 阶段计算力的标准差：
- 偏差大 → 模型不确定 → 需要 VASP 标注
- 偏差小 → 模型一致 → 该区域已学好
`,
    tags: ["deepmd", "训练", "参数", "descriptor", "学习率"],
    sourceFiles: ["dpgen_tic_project_summary_v2.html"],
  },
  {
    slug: "committee-model",
    title: "Committee Model 策略",
    category: "deepmd-training",
    summary: "为什么要训练 4 个模型？committee model 的原理与偏差评估",
    content: `# Committee Model 策略

## 为什么是 4 个模型？

DP-GEN 使用 **committee model（委员会模型）** 策略：
- 用相同数据、不同随机种子训练 4 个独立模型
- 推理时，对同一结构分别用 4 个模型计算原子力
- 计算 4 个模型的力之间的标准差 → **模型偏差（model deviation）**

## 偏差的含义

| 偏差大小 | 含义 | 行动 |
|---------|------|------|
| 小（< trust_lo） | 4 个模型一致，该区域已学好 | 无需标注 |
| 中 | 模型不完全一致 | 不标注（边界情况） |
| 大（> trust_hi） | 模型分歧大，该区域陌生 | 送去 VASP 标注 |

## 偏差计算

\`\`\`
max_devi_f = max(σ_f)  # 每个原子的力标准差的最大值
\`\`\`

这个值记录在 \`model_devi.out\` 中，每列对应一个模型的偏差。

## 实际效果

- 第一轮：模型只见过 AIMD 数据，偏差很大
- 随着标注数据回流，模型的"知识边界"逐渐扩展
- 最后几轮 candidate 比例降到很低 → 模型收敛

> 一句话：**Committee 用模型之间的分歧来"投票"选出模型最不确定的结构**
`,
    tags: ["deepmd", "committee", "模型偏差", "主动学习"],
    sourceFiles: ["工作流程以及模版文件夹.md"],
  },
  {
    slug: "data-reflux-outcar-to-set",
    title: "数据回流：OUTCAR → set.xxx",
    category: "deepmd-training",
    summary: "如何将 VASP 标注产出的 OUTCAR 转换成下一轮训练可用的 set.xxx 格式",
    content: `# 数据回流：OUTCAR → set.xxx

## 流程

1. 收集 \`02.fp\` 下所有 task 目录的 OUTCAR
2. 用 dpdata 提取能量、力、应力
3. 转换为 DeePMD 训练格式

## 核心代码

\`\`\`python
import dpdata
import numpy as np

# 收集所有 OUTCAR
systems = []
for task_dir in sorted(Path("iter.000000/02.fp").glob("task.*")):
    outcar = task_dir / "OUTCAR"
    if outcar.exists():
        s = dpdata.LabeledSystem(str(outcar), fmt="vasp/outcar")
        systems.append(s)

# 合并并保存
merged = systems[0]
for s in systems[1:]:
    merged.append(s)

merged.to_deepmd_npy("set.001")
\`\`\`

## 输出格式

\`\`\`text
set.001/
├── box.npy      # 晶胞向量 (n_frames, 9)
├── coord.npy    # 原子坐标 (n_frames, n_atoms*3)
├── energy.npy   # 总能量 (n_frames,)
├── force.npy    # 原子力 (n_frames, n_atoms*3)
├── virial.npy   # 应力张量 (n_frames, 9)
└── type.raw     # 原子类型映射
\`\`\`

## 数据合并

第二轮训练时，训练集 = set.000（初始数据）+ set.001（新标注数据），
模型在更大的数据集上重训，偏差范围收窄。

## 注意事项

- 确保 type_map 一致（Ti→0, C→1）
- 检查 virial 是否提取成功（某些旧版 VASP OUTCAR 不含 virial）
- 如果标注失败（OUTCAR 不完整），该 task 应跳过
`,
    tags: ["deepmd", "数据回流", "OUTCAR", "dpdata", "训练集"],
    sourceFiles: ["工作流程以及模版文件夹.md"],
  },
];
