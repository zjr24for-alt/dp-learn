import type { Article } from "@/lib/types";

/** 来源: deepmodeling/dpdata 官方文档 + examples */
export const dpdataGuideArticles: Article[] = [
  {
    slug: "dpdata-overview",
    title: "dpdata 全能数据转换：从 VASP/Gaussian 到 DeePMD 格式",
    category: "deepmd-training",
    summary: "dpdata 支持的输入/输出格式、LabeledSystem 用法、数据合并与切分、多格式互转的完整指南",
    tags: ["dpdata", "数据转换", "LabeledSystem", "deepmd", "格式"],
    sourceFiles: ["deepmodeling/dpdata"],
    content: `# dpdata 全能数据转换指南

dpdata 是 DeepModeling 生态的数据处理枢纽，负责在各种 DFT/MD 输出格式与 DeePMD 训练格式之间做转换。

## 核心概念

\`\`\`text
┌─────────────┐     dpdata      ┌──────────────┐
│ DFT 输出     │ ──────────────→ │ DeePMD 训练   │
│ OUTCAR/xml   │   LabeledSystem │ set.xxx/     │
│ log/xyz/...  │                 │ coord.npy    │
└─────────────┘                 │ energy.npy   │
                                │ force.npy    │
                                └──────────────┘
\`\`\`

两个核心类：
- **System**: 只有坐标和晶胞（无标签），用于结构操作
- **LabeledSystem**: 坐标 + 能量 + 力 + 应力（有标签），用于训练数据

## 安装

\`\`\`bash
# conda 安装（推荐）
conda install -c conda.deepmodeling dpdata

# pip 安装
pip install dpdata
\`\`\`

## 支持的输入格式

| 格式标识 | 来源软件 | 读取文件 | 说明 |
|---------|---------|---------|------|
| vasp/outcar | VASP | OUTCAR | 最常用，含能量/力/应力 |
| vasp/xml | VASP | vasprun.xml | 更结构化，推荐大数据量 |
| vasp/poscar | VASP | POSCAR | 只有结构，无标签 |
| deepmd/npy | DeePMD | set.xxx/ | DeePMD 原生 numpy 格式 |
| deepmd/raw | DeePMD | set.xxx/ | DeePMD 原生文本格式 |
| gaussian/log | Gaussian | .log | 高斯输出 |
| gaussian/md | Gaussian | .log | 高斯 MD 轨迹 |
| cp2k/output | CP2K | output | CP2K 输出 |
| pwscf/input | Quantum ESPRESSO | .in | QE 输入 |
| pwscf/output | Quantum ESPRESSO | .out | QE 输出 |
| siesta/output | SIESTA | .out | SIESTA 输出 |
|quip/gap/xyz | QUIP/GAP | .xyz | GAP 势函数训练数据 |

## 基本用法

### 1. 读取 VASP 数据

\`\`\`python
import dpdata

# 从 OUTCAR 读取（最常用）
# fmt 指定格式，dpdata 会自动解析 OUTCAR 中的能量、力、应力
system = dpdata.LabeledSystem("OUTCAR", fmt="vasp/outcar")

# 从 vasprun.xml 读取（更稳定，推荐大数据量）
system = dpdata.LabeledSystem("vasprun.xml", fmt="vasp/xml")

# 自动检测格式（省略 fmt）
system = dpdata.LabeledSystem("OUTCAR")  # dpdata 自动识别

# 查看基本信息
print(f"原子数: {system.get_natoms()}")       # 如 64
print(f"元素种类: {system.get_atom_names()}")  # 如 ['Ti', 'C']
print(f"帧数: {len(system)}")                  # 如 100
print(f"原子类型: {system.get_atom_types()}")   # 如 [0,0,...,1,1,...]
\`\`\`

### 2. 导出为 DeePMD 训练格式

\`\`\`python
# 导出为 npy 格式（推荐，速度快）
# 生成目录结构：
# training_data/
# ├── type_map.raw    # 元素映射 ["Ti", "C"]
# ├── type.raw        # 每个原子的类型编码 [0,0,...,1,1,...]
# └── set.000/
#     ├── box.npy      # 晶胞 (n_frames, 9)
#     ├── coord.npy    # 坐标 (n_frames, n_atoms*3)
#     ├── energy.npy   # 能量 (n_frames,)
#     ├── force.npy    # 力 (n_frames, n_atoms*3)
#     └── virial.npy   # 应力 (n_frames, 9)
system.to_deepmd_npy("training_data/")

# 导出为 raw 格式（文本，便于检查）
system.to_deepmd_raw("training_data_raw/")
\`\`\`

### 3. 数据合并（DP-GEN 数据回流核心操作）

\`\`\`python
import dpdata
from pathlib import Path

# 场景：收集 DP-GEN 一轮 FP 标注的所有 OUTCAR，合并为训练集
systems = []
for task_dir in sorted(Path("iter.000000/02.fp").glob("task.*")):
    outcar = task_dir / "OUTCAR"
    if outcar.exists() and outcar.stat().st_size > 0:
        try:
            # 读取单个 task 的 OUTCAR
            s = dpdata.LabeledSystem(str(outcar), fmt="vasp/outcar")
            if len(s) > 0:  # 确保有有效帧
                systems.append(s)
        except Exception as e:
            print(f"跳过 {task_dir}: {e}")  # OUTCAR 不完整时跳过

if not systems:
    raise ValueError("没有找到有效的 OUTCAR 文件！")

# 合并所有系统（dpdata 用 append 做拼接）
merged = systems[0]
for s in systems[1:]:
    merged.append(s)

print(f"合并完成: {len(merged)} 帧, {merged.get_natoms()} 原子")

# 导出
merged.to_deepmd_npy("new_training_data/")
\`\`\`

### 4. 格式互转

\`\`\`python
# OUTCAR → POSCAR（提取结构）
system = dpdata.System("OUTCAR", fmt="vasp/outcar")
system.to_vasp_poscar("CONTCAR_extracted")

# DeePMD npy → POSCAR
system = dpdata.System("training_data/", fmt="deepmd/npy")
system.to_vasp_poscar("from_deepmd.vasp")

# OUTCAR → LAMMPS data
system.to_lammps_lmp("data.lammps")

# LAMMPS dump → DeePMD
system = dpdata.System("dump.lammpstrj", fmt="lammps/dump")
\`\`\`

## 进阶用法

### 数据切分（训练集/测试集分离）

\`\`\`python
import numpy as np

system = dpdata.LabeledSystem("OUTCAR", fmt="vasp/outcar")
n_frames = len(system)

# 随机打乱并切分 80/20
indices = np.random.permutation(n_frames)
n_train = int(0.8 * n_frames)

train_idx = sorted(indices[:n_train])
test_idx = sorted(indices[n_train:])

# 切分
train_system = system.sub_system(train_idx)
test_system = system.sub_system(test_idx)

train_system.to_deepmd_npy("train/")
test_system.to_deepmd_npy("test/")
\`\`\`

### 多目录批量读取

\`\`\`python
import dpdata
from pathlib import Path

# 批量读取多个 AIMD 轨迹
all_systems = dpdata.LabeledSystem()
for outcar in Path("aimd_runs/").glob("*/OUTCAR"):
    s = dpdata.LabeledSystem(str(outcar))
    all_systems.append(s)

print(f"总计: {len(all_systems)} 帧")
all_systems.to_deepmd_npy("aimd_training_data/")
\`\`\`

### 深度等价（Deep Equivalent）数据处理

\`\`\`python
# 用 dpdata 的 shift_energy 调整能量参考
# 不同 DFT 计算的能量参考不一致时需要对齐
system = dpdata.LabeledSystem("OUTCAR")
# system.data["energies"] += shift_value  # 手动偏移
\`\`\`

## 常见问题

### 1. "No valid data found in OUTCAR"
- OUTCAR 不完整（VASP 未正常结束）
- 检查 OUTCAR 末尾是否有 "Voluntary context switches" 行
- 解决：用 try-except 包裹读取，跳过坏文件

### 2. virial.npy 缺失
- 旧版 VASP 的 OUTCAR 可能不含 stress 信息
- 检查 OUTCAR 中是否有 "in kB" 行
- 解决：在 INCAR 中确保 ISIF ≥ 2

### 3. type_map 不一致
- 合并多个数据源时，type_map 必须完全一致
- TiC 体系：type_map = ["Ti", "C"]，顺序固定
- 解决：检查每个 set.xxx 的 type_map.raw

### 4. 内存不足
- 大量 AIMD 轨迹可能几百 GB
- 解决：分批读取并导出，或使用 dpdata 的 lazy 模式
`,
  },
  {
    slug: "dpdata-dpgen-integration",
    title: "dpdata 在 DP-GEN 工作流中的实战应用",
    category: "dpgen-workflow",
    summary: "dpdata 在 DP-GEN 主动学习各阶段的具体用法：初始化数据、数据回流、数据质量检查",
    tags: ["dpdata", "dpgen", "数据回流", "初始化", "主动学习"],
    sourceFiles: ["deepmodeling/dpdata", "deepmodeling/dpgen"],
    content: `# dpdata 在 DP-GEN 工作流中的实战应用

## 在 DP-GEN 各阶段的角色

\`\`\`text
阶段 1: 初始化 ──→ dpdata 生成 init_data/set.000/
阶段 2: 训练   ──→ DeePMD 直接读取 set.xxx/ (dpdata 格式)
阶段 3: 探索   ──→ LAMMPS 输出 dump (dpdata 可读)
阶段 4: 标注   ──→ VASP 输出 OUTCAR (dpdata 读取)
阶段 5: 回流   ──→ dpdata 合并 OUTCAR → set.xxx/
阶段 6: 再训练 ──→ init_data + 所有 set.xxx/ 合并训练
\`\`\`

## 阶段 1：初始化数据准备

从 AIMD 轨迹提取初始训练集：

\`\`\`python
import dpdata
from pathlib import Path

# 从多个 AIMD 目录收集数据
# 每个目录代表一个温度/压力条件下的 AIMD 轨迹
init_systems = []
for aimd_dir in sorted(Path("aimd_runs").glob("*")):
    outcar = aimd_dir / "OUTCAR"
    if outcar.exists():
        s = dpdata.LabeledSystem(str(outcar), fmt="vasp/outcar")
        # 每 N 帧取一帧（降采样，避免相邻帧高度相似）
        step = max(1, len(s) // 50)  # 每个轨迹取约 50 帧
        s_sub = s.sub_system(list(range(0, len(s), step)))
        init_systems.append(s_sub)
        print(f"{aimd_dir.name}: {len(s)} → {len(s_sub)} 帧")

# 合并
merged = init_systems[0]
for s in init_systems[1:]:
    merged.append(s)

# 导出到 dpgen 的 init_data 目录
merged.to_deepmd_npy("dpgen/init_data/set.000/")
print(f"初始化数据: {len(merged)} 帧")
\`\`\`

## 阶段 5：数据回流（最关键）

每轮 DP-GEN 迭代后，收集标注数据并合并到训练集：

\`\`\`python
import dpdata
from pathlib import Path

def collect_fp_data(iter_index, fp_base="02.fp"):
    """收集一轮迭代中所有成功标注的 OUTCAR"""
    iter_dir = Path(f"iter.{iter_index:06d}")
    fp_dir = iter_dir / fp_base

    systems = []
    failed = 0

    for task_dir in sorted(fp_dir.glob("task.*")):
        outcar = task_dir / "OUTCAR"
        if not outcar.exists():
            failed += 1
            continue

        try:
            s = dpdata.LabeledSystem(str(outcar), fmt="vasp/outcar")
            if len(s) > 0:
                systems.append(s)
            else:
                failed += 1
        except Exception as e:
            print(f"  跳过 {task_dir.name}: {e}")
            failed += 1

    if systems:
        merged = systems[0]
        for s in systems[1:]:
            merged.append(s)
        return merged, failed
    return None, failed

# 收集并保存
data, n_failed = collect_fp_data(0)
if data:
    data.to_deepmd_npy("iter.000000/02.fp/data_deepmd/")
    print(f"标注数据: {len(data)} 帧, 失败 {n_failed} 个 task")
\`\`\`

## 阶段 6：训练数据合并

每轮训练前，合并初始数据 + 所有已回流数据：

\`\`\`python
import dpdata

# 加载初始数据
all_data = dpdata.LabeledSystem("dpgen/init_data/set.000/", fmt="deepmd/npy")

# 逐轮合并新标注数据
for i in range(current_iter):
    new_data_path = f"iter.{i:06d}/02.fp/data_deepmd/"
    try:
        new_data = dpdata.LabeledSystem(new_data_path, fmt="deepmd/npy")
        all_data.append(new_data)
        print(f"轮次 {i}: +{len(new_data)} 帧, 累计 {len(all_data)} 帧")
    except FileNotFoundError:
        print(f"轮次 {i}: 无数据")

# 导出合并后的训练集
all_data.to_deepmd_npy("merged_training_data/")
\`\`\`

## 数据质量检查

\`\`\`python
import dpdata
import numpy as np

system = dpdata.LabeledSystem("training_data/", fmt="deepmd/npy")

# 检查能量分布
energies = system.data["energies"]  # shape: (n_frames,)
print(f"能量范围: {energies.min():.3f} ~ {energies.max():.3f} eV")
print(f"能量均值: {energies.mean():.3f} eV")
print(f"能量标准差: {energies.std():.3f} eV")

# 检查力的分布
forces = system.data["forces"]  # shape: (n_frames, n_atoms, 3)
force_magnitudes = np.linalg.norm(forces, axis=2)
print(f"力范围: {force_magnitudes.min():.3f} ~ {force_magnitudes.max():.3f} eV/Å")
print(f"力均值: {force_magnitudes.mean():.3f} eV/Å")

# 检查异常帧（力 > 50 eV/Å 通常表示结构有问题）
bad_frames = np.where(force_magnitudes.max(axis=1) > 50)[0]
if len(bad_frames) > 0:
    print(f"⚠️ 发现 {len(bad_frames)} 帧力异常大，请检查结构")
    print(f"  异常帧索引: {bad_frames.tolist()}")
\`\`\`
`,
  },
];
