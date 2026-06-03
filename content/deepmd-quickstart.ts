import type { Article } from "@/lib/types";

/** 来源: deepmodeling/deepmd-kit 官方 quick_start + examples */
export const deepmdQuickstartArticles: Article[] = [
  {
    slug: "deepmd-quick-start",
    title: "DeePMD 快速上手：从数据到势函数",
    category: "deepmd-training",
    summary: "训练一个 DP 势函数的完整流程：数据准备 → 训练 → 冻结 → 测试 → LAMMPS 推理（20 分钟上手）",
    tags: ["deepmd", "训练", "冻结", "LAMMPS"],
    sourceFiles: ["deepmodeling/deepmd-kit/doc/getting-started"],
    content: `# DeePMD 快速上手

## 完整流程

\`\`\`text
准备数据 (dpdata)
    ↓
训练 (dp train input.json)
    ↓
冻结 (dp freeze -o frozen_model.pb)
    ↓
测试 (dp test -m frozen_model.pb)
    ↓
LAMMPS 推理 (pair_style deepmd)
\`\`\`

## 1. 数据准备

使用 dpdata 从 VASP 输出提取训练数据：

\`\`\`python
import dpdata
import numpy as np

# ── 读取 VASP 输出 ──────────────────────────────────────────────
# fmt="vasp/outcar" 显式指定格式；也可省略，dpdata 会自动识别
system = dpdata.LabeledSystem("OUTCAR", fmt="vasp/outcar")

# 查看基本信息（调试用）
print(f"原子数: {system.get_natoms()}")       # 如 216
print(f"元素种类: {system.get_atom_names()}")  # 如 ['Ti', 'C']
print(f"帧数: {len(system)}")                  # 如 100
print(f"原子类型编码: {system.get_atom_types()}")  # 如 [0,0,...,1,1,...]

# ── 导出为 DeePMD 训练格式 ───────────────────────────────────────
# to_deepmd_npy() 生成 set.000/ 目录，包含：
#   type_map.raw  — 元素映射 ["Ti", "C"]
#   type.raw      — 每个原子的类型编码
#   set.000/box.npy      — 晶胞向量 (n_frames, 9)
#   set.000/coord.npy    — 原子坐标 (n_frames, n_atoms*3)
#   set.000/energy.npy   — 总能量 (n_frames,)
#   set.000/force.npy    — 原子力 (n_frames, n_atoms*3)
#   set.000/virial.npy   — 应力张量 (n_frames, 9)
system.to_deepmd_npy("training_data/")

# ── 数据质量检查 ─────────────────────────────────────────────────
# 检查力分布，排除异常帧（力 > 50 eV/Å 通常表示结构有问题）
forces = system.data["forces"]  # shape: (n_frames, n_atoms, 3)
force_max = np.abs(forces).max()
print(f"最大力: {force_max:.2f} eV/Å")
if force_max > 50:
    print("⚠️ 存在异常大的力，建议检查结构是否合理")
\`\`\`

也可以从 vasprun.xml 读取（更稳定，推荐大数据量）：
\`\`\`python
# vasprun.xml 结构化更好，解析更可靠
system = dpdata.LabeledSystem("vasprun.xml", fmt="vasp/xml")
\`\`\`

## 2. 训练配置 (input.json)

\`\`\`json
{
  "model": {
    "type_map": ["Ti", "C"],
    "descriptor": {
      "type": "se_e2_a",
      "sel": [40, 40],
      "rcut_smth": 5.0,
      "rcut": 6.5,
      "neuron": [25, 50, 100],
      "axis_neuron": 16,
      "seed": 1
    },
    "fitting_net": {
      "neuron": [240, 240, 240],
      "resnet_dt": true,
      "seed": 1
    }
  },
  "learning_rate": {
    "type": "exp",
    "start_lr": 0.001,
    "decay_steps": 5000,
    "stop_lr": 3.3e-8
  },
  "loss": {
    "start_pref_e": 0.02,
    "limit_pref_e": 1,
    "start_pref_f": 1000,
    "limit_pref_f": 1,
    "start_pref_v": 0,
    "limit_pref_v": 0
  },
  "training": {
    "numb_steps": 400000,
    "seed": 1,
    "disp_file": "lcurve.out",
    "save_freq": 1000
  }
}
\`\`\`

### 关键参数解释

| 参数 | 含义 | 调参建议 |
|------|------|---------|
| sel | 每种原子的最大近邻数 | 需大于体系中实际近邻数，否则截断报错；看体系中径向分布函数(RDF)第一峰位置外的原子数 |
| rcut | 截断半径 (Å) | 太大会增加计算量，太小会丢失近邻信息；通常 6-8 Å (来源: DeePMD 文档) |
| neuron (fitting) | 拟合网络结构 | [240,240,240] 适合多数体系；更复杂体系可加到 [480,480,480] |
| start_pref_f | 力损失的初始权重 | 1000（重视力）是默认值，力比能量更敏感 |
| seed | 随机种子 | committee model 各模型需不同 seed |

## 3. 训练

\`\`\`bash
# ── TensorFlow 后端（默认，v2.x 时代主流） ──
dp train input.json

# ── PyTorch 后端（v3.x 推荐，性能更好） ──
dp --pt train input.json

# ── 多 GPU 训练 (PyTorch 后端) ──
# --num-nodes: 节点数
# --node-rank: 当前节点编号（0 为主节点）
dp --pt train input.json --num-nodes 1 --node-rank 0

# ── 从 checkpoint 恢复训练（中断后续跑） ──
dp train input.json --restart model.ckpt.pt
\`\`\`

查看训练曲线：
\`\`\`bash
# lcurve.out 格式：step  lr  loss_e  loss_f  loss_v
# loss_e: 能量损失，loss_f: 力损失，loss_v: virial 损失
# 正常情况下 loss_f 应逐步下降（力是主要学习目标）
tail -5 lcurve.out
\`\`\`

训练状态判断：
- loss_f 持续下降 → 正常训练
- loss_f 震荡不降 → 学习率太大，尝试降低 start_lr
- loss_f 突然跳高 → 数据有问题，检查异常帧

## 4. 冻结模型

\`\`\`bash
dp freeze -o frozen_model.pb
\`\`\`
- 冻结将 checkpoint 转为推理用的 .pb 文件
- 同时生成压缩模型备选（更小更快，但精度略有损失）

## 5. 测试

\`\`\`bash
dp test -m frozen_model.pb -s test_data/ -n 100
\`\`\`
输出示例：
\`\`\`text
Energy RMSE: 0.0008 eV/atom
Force  RMSE: 0.0460 eV/Å
\`\`\`

**通过标准**（适合大多数材料体系）：
- Energy RMSE < 0.001 eV/atom
- Force RMSE < 0.10 eV/Å

## 6. LAMMPS 推理

\`\`\`bash
# in.lammps
pair_style deepmd frozen_model.pb
pair_coeff * *
\`\`\`

LAMMPS 中的注意事项：
- \`pair_style deepmd\` 自动处理跨种类原子对
- 模型路径必须正确，建议用绝对路径
- 首次运行会加载模型到 GPU 显存，注意显存容量`,
  },
];
