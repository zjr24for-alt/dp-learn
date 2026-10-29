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
- 取 4 个模型预测力的最大差值 → **模型偏差（model deviation）**

## 偏差的含义（三分类，官方源码口径）

DP-GEN 按 \`f_trust_lo\` / \`f_trust_hi\` 把每一帧划入**三类**，这是主动学习筛选的全部逻辑：

| 判据 | 官方分类 | 含义 | 行动 |
|------|---------|------|------|
| \`max_devi_f ≤ f_trust_lo\` | **accurate** | 4 个模型一致，该区域已学好 | 跳过，不标注 |
| \`f_trust_lo < max_devi_f ≤ f_trust_hi\` | **candidate** | 模型有分歧但仍在可信区间 | **送去 VASP 标注** |
| \`max_devi_f > f_trust_hi\` | **failed** | 偏差过大，判定为不合理构型 | **丢弃，不标注** |

> ⚠️ **最易记反的一条**：不是"偏差越大越要标注"。超过 \`trust_hi\` 的帧被判为 failed 直接丢弃，**只有落在 [lo, hi] 带内的才是 candidate**。搞反会让阈值完全失效。

## 偏差计算

\`\`\`text
max_devi_f = 对每个原子取各模型预测力的最大差值，再对所有原子取最大
\`\`\`

即 \`max_i ( max_m F_{m,i} − min_m F_{m,i} )\`，**不是标准差**。这个值记在 \`model_devi.out\` 里。

## 阈值怎么定（官方经验规则）

官方给出的可复核校准规则：

\`\`\`python
af = mean(|F|)              # 训练集里所有原子-力分量的平均绝对值
f_trust_lo = 0.2 * af
f_trust_hi = 0.5 * af
\`\`\`

**先算 mean|F|，再按 0.2 / 0.5 倍套**，不要凭感觉拍数。另有一条关键提醒：

> 体系温度升高、力的幅度变大时，trust level 要相应调大。

同一套 \`lo\` 在不同温度下判出的准确率差异极大——实测某体系 \`lo=0.25\` 时，300 K 判 85.5% 准确，3200 K 只判 47.8%。**高温体系必须单独设阈值。**

### 三个可用的进阶入口

| 机制 | 用法 |
|------|------|
| 按体系设阈值 | \`f_trust_lo/hi\` 可传 **list 或 dict**（按 \`sys_idx\` 索引），应对不同体系偏差尺度差异 |
| 按 job 覆盖 | \`model_devi_jobs\` 每个条目可自带 \`model_devi_f_trust_lo\`，优先于全局 |
| 显式控帧数 | \`model_devi_adapt_trust_lo: true\` + \`model_devi_numb_candi_f\` / \`model_devi_perc_candi_f\`，把"选多少帧"变成显式参数 |

> ⚠️ \`adapt_trust_lo\` **只换 lo 不换 hi**：hi 仍由 \`model_devi_f_trust_hi\` 决定。它报告出来的 \`f_trust_lo\` 是"选完之后倒推出的最小值"，是结果不是输入。

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
from pathlib import Path

# ── 收集所有 OUTCAR ──────────────────────────────────────────────
# DP-GEN 每轮 FP 标注后，task 目录下会有 OUTCAR 文件
systems = []
failed_tasks = []  # 记录失败的 task

for task_dir in sorted(Path("iter.000000/02.fp").glob("task.*")):
    outcar = task_dir / "OUTCAR"
    if not outcar.exists():
        failed_tasks.append(task_dir.name)
        continue

    try:
        # fmt="vasp/outcar" 告诉 dpdata 按 VASP OUTCAR 格式解析
        # 解析内容：能量(eV)、力(eV/Å)、应力(kB)
        s = dpdata.LabeledSystem(str(outcar), fmt="vasp/outcar")
        if len(s) > 0:  # 确保有有效帧
            systems.append(s)
        else:
            failed_tasks.append(task_dir.name)
    except Exception as e:
        # OUTCAR 不完整（VASP 崩溃/超时）时会解析失败
        print(f"跳过 {task_dir.name}: {e}")
        failed_tasks.append(task_dir.name)

print(f"成功: {len(systems)} 个 task, 失败: {len(failed_tasks)} 个")

# ── 合并并保存 ───────────────────────────────────────────────────
# dpdata 用 append() 做帧级拼接（不是数组级拼接）
merged = systems[0]
for s in systems[1:]:
    merged.append(s)

# to_deepmd_npy() 生成 DeePMD 训练所需的 numpy 文件
# 输出目录结构：
#   set.001/
#   ├── box.npy      # 晶胞向量 (n_frames, 9)
#   ├── coord.npy    # 原子坐标 (n_frames, n_atoms*3)
#   ├── energy.npy   # 总能量 (n_frames,)
#   ├── force.npy    # 原子力 (n_frames, n_atoms*3)
#   └── virial.npy   # 应力张量 (n_frames, 9)
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
  {
    slug: "deepmd-ecosystem-2026",
    title: "DeePMD 生态进展（2026）：v3.2 与 DPA4",
    category: "deepmd-training",
    summary: "DeePMD-kit v3.2.0 新增能力、DPA4/SeZM 架构与性能、原生 ZBL 与拼接 ZBL 的区别、预训练微调路线与已知限制",
    content: `# DeePMD 生态进展（2026）

## 一、DeePMD-kit v3.2.0

| 项 | 内容 |
|---|---|
| \`pt_expt\` 后端 | Array API + \`torch.export\` + \`torch.compile\`；**旧 TorchScript 后端将被废弃** |
| DPA4 / SeZM | 新描述符+模型，**仅 PyTorch**，导出走 \`.pt2\` |
| DPA4C | 紧凑变体（可压缩） |
| JAX 后端 | 首次支持**训练**（此前仅推理） |
| \`.pt2\` 推理 | AOTInductor C/C++，支持 DPA1/2/3 |
| LAMMPS | GNN 模型多 rank |
| 训练 | 力 L2-norm / MAE loss、WSD 调度器、LMDB 数据集 |

**已修复**：DPA2/DPA3 Hessian NaN、checkpoint 加载、CUDA OOM、近邻表死锁。

**已知限制**：**DPA3 不支持 \`dp compress\`** —— 会影响部署体积，转 DPA3 前必须先确认。

## 二、DPA4（arXiv:2606.02419）

### 性能

- Matbench Discovery **CPS 第 1**
- 参数量 0.48M–25.2M，分 Air（5.1M）/ Plus（8.8M）/ Pro（25.2M）三档
- 训练成本 ≈ DPA3 的 **1/10**，单张消费级旗舰卡一天可复现同精度

### 架构

- EMFA SO(2) 卷积 + 局部坐标注意力，降维处理转动等变
- 严格满足平移/旋转/置换对称与能量守恒
- **原生 ZBL**：\`E = E_NN + E_ZBL\`，单一标量微分 ⇒ 保守力

### 原生 ZBL vs 拼接 ZBL（重要区别）

传统做法是把 ZBL 与神经网络势**拼接**：在切换半径处做平滑过渡。这会产生**切换力伪影**——\`dλ/dR × (E_ZBL − E_NN)\` 这一项没有对应的物理来源。

DPA4 的原生 ZBL 把两者放进同一个可微能量表达式，避免了这个伪影。学习分支在 ZBL 区受 C³ 钳制距离 + source-freeze gate 抑制。

> ⚠️ **但原生 ZBL 只解决极近距（约 <1 Å）**。如果你的问题是**中等距离的排斥壁斜率偏低**（比如 1.3–1.5 Å 区段力偏软），那一段在 ZBL 生效区之外，仍由学习分支负责——**换模型不能替代针对该区间的数据补充**。

## 三、预训练权重与微调

\`\`\`bash
# 下载预训练权重
dp pretrained download DPA4-Neo-OMat24-v20260805

# 微调
dp --pt train input_finetune.json --finetune <ckpt>
\`\`\`

- 支持 DPA-4 **LoRA** 微调（仅 PyTorch 单任务）
- ⚠️ **许可需逐个模型卡核对**：部分权重（如 OMat24 系列的分子版本）为 \`cc-by-nc-4.0\`，**禁止商用**

### 什么时候值得走微调路线

预训练微调特别适合**近平衡数据饥饿**的场景：如果训练集里低力（\`|F| < 0.05\`）帧占比极低（如 1–2%），模型在近平衡区会学不好；而大规模预训练基座在近平衡构型上覆盖充分，微调可直接继承这部分知识。

**代价**：需要 PyTorch 后端 + \`.pt2\`，通常意味着重建整套环境分工（训练 / 探索 / dpdata 可能各用不同环境），并重验 LAMMPS 插件、重跑历史基线。

> 4 模型 ensemble 机制本身不受影响——DPA4 同样可以训多个随机种子。

## 四、版本选型建议

| 优先级 | 动作 | 理由 |
|---|---|---|
| 观察 | 稳定版本不必急着升级 | 若当前 TF/常规路线稳定，收益主要集中在 DPA4 |
| 评估 | 预训练微调 vs 从零训 | 唯一能直击近平衡数据饥饿的路线 |
| 记录 | 转 DPA3 前先确认无 \`dp compress\` | 影响部署体积 |

## 参考来源

- DeePMD-kit v3.2.0 release: github.com/deepmodeling/deepmd-kit/releases/tag/v3.2.0
- DPA4 论文: arxiv.org/abs/2606.02419
- DPA4 blog: blogs.deepmodeling.com/DPA4_05_22_2026/
- DP-GEN releases: github.com/deepmodeling/dpgen/releases
`,
    tags: ["deepmd", "DPA4", "v3.2", "ZBL", "微调", "生态进展"],
    sourceFiles: ["DeePMD-生态进展-2026-10.md"],
  },
];
