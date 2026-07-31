import type { DocEntry } from "@/lib/types";

export const dpdataDocs: DocEntry[] = [
  {
    id: "dpdata-install",
    source: "dpdata",
    title: "dpdata 安装与验证",
    summary: "dpdata 的 conda/pip 安装方法，支持 DeepModeling 生态全部数据格式",
    content: `dpdata 是 DeepModeling 生态的数据处理核心库。
安装方式：
1. conda install -c conda.deepmodeling dpdata（推荐）
2. pip install dpdata

安装后验证：
python -c "import dpdata; print(dpdata.__version__)"`,
    url: "https://docs.deepmodeling.com/projects/dpdata/en/latest/",
    tags: ["dpdata", "安装", "conda", "数据处理"],
  },
  {
    id: "dpdata-labeled-system",
    source: "dpdata",
    title: "dpdata.LabeledSystem 用法详解",
    summary: "LabeledSystem 的读取、导出、合并、切分操作，以及支持的所有格式",
    content: `LabeledSystem 是 dpdata 最核心的类，用于处理带标签（能量/力/应力）的训练数据。

读取：
system = dpdata.LabeledSystem("OUTCAR", fmt="vasp/outcar")
system = dpdata.LabeledSystem("vasprun.xml", fmt="vasp/xml")
system = dpdata.LabeledSystem("data/", fmt="deepmd/npy")

导出：
system.to_deepmd_npy("output/")    # npy 格式（推荐）
system.to_deepmd_raw("output/")    # raw 格式（文本）
system.to_vasp_poscar("POSCAR")    # VASP 结构

操作：
system.append(other)               # 合并
system.sub_system(indices)         # 切分
system.get_natoms()                # 原子数
len(system)                        # 帧数`,
    url: "https://docs.deepmodeling.com/projects/dpdata/en/master/",
    tags: ["dpdata", "LabeledSystem", "数据转换", "训练数据"],
  },
  {
    id: "dpdata-supported-formats",
    source: "dpdata",
    title: "dpdata 支持的所有数据格式",
    summary: "dpdata 支持的输入/输出格式完整列表：VASP、Gaussian、CP2K、QE、LAMMPS、DeePMD 等",
    content: `dpdata 支持读取的格式：
- vasp/outcar: VASP OUTCAR（最常用）
- vasp/xml: VASP vasprun.xml
- vasp/poscar: VASP POSCAR（仅结构）
- deepmd/npy: DeePMD numpy 格式
- deepmd/raw: DeePMD 文本格式
- gaussian/log: Gaussian 日志
- gaussian/md: Gaussian MD 输出
- cp2k/output: CP2K 输出
- pwscf/input: Quantum ESPRESSO 输入
- pwscf/output: Quantum ESPRESSO 输出
- siesta/output: SIESTA 输出
- lammps/dump: LAMMPS dump 轨迹
- lammps/data: LAMMPS data 文件
- quip/gap/xyz: QUIP/GAP 训练数据

dpdata 支持导出的格式：
- to_deepmd_npy(): DeePMD numpy 格式
- to_deepmd_raw(): DeePMD 文本格式
- to_vasp_poscar(): VASP POSCAR
- to_lammps_lmp(): LAMMPS data
- to_gaussian(): Gaussian 输入`,
    url: "https://docs.deepmodeling.com/projects/dpdata/en/master/",
    tags: ["dpdata", "格式", "VASP", "Gaussian", "LAMMPS", "DeePMD"],
  },
  {
    id: "dpdata-reflux-outcar",
    source: "dpdata",
    title: "DP-GEN 数据回流：OUTCAR → set.xxx 完整流程",
    summary: "把主动学习标注产出的 OUTCAR 用 dpdata 批量转成 DeePMD 训练格式并合并进训练集",
    content: `数据回流是主动学习闭环的关键一步：把 02.fp 标注产出的 OUTCAR 转成训练数据。

【批量转换】
\`\`\`python
import dpdata
import glob

# 1. 收集所有 OUTCAR
outcars = sorted(glob.glob("iter.000000/02.fp/task.*/OUTCAR"))

# 2. 逐个读取并合并
systems = []
for f in outcars:
    try:
        systems.append(dpdata.LabeledSystem(f, fmt="vasp/outcar"))
    except Exception as e:
        print(f"跳过 {f}: {e}")   # VASP 崩溃时 OUTCAR 不完整，用 try 跳过

merged = systems[0]
for s in systems[1:]:
    merged.append(s)

# 3. 导出为 DeePMD npy 格式
merged.to_deepmd_npy("train_data_merge")
\`\`\`

【关键点】
- 读取 OUTCAR 务必用 try-except 包裹（VASP 崩溃时 OUTCAR 不完整会报错）
- 合并前所有 data 的 type_map 必须一致（元素顺序必须相同）
- to_deepmd_npy 生成 set.xxx/ 目录结构，直接可作为 training_data
- 追加到已有训练集：再读已有 set.xxx 合并后重新导出，或用 dpdata 的 append 到现有 System`,
    url: "https://docs.deepmodeling.com/projects/dpdata/en/master/",
    tags: ["dpdata", "数据回流", "OUTCAR", "主动学习", "set.xxx"],
  },
  {
    id: "dpdata-conversion-common-pitfalls",
    source: "dpdata",
    title: "dpdata 格式转换常见坑",
    summary: "dpdata 转换数据时最常踩的坑：type_map 不一致、VASP 崩溃 OUTCAR、原子序数、重复帧去重",
    content: `dpdata 转换数据时的常见问题：

【type_map 不一致】
- 两个 System 合并时报 "type_map mismatch"
- 解决：合并前统一 type_map（元素顺序必须相同）
- 检查：system.get_atom_names() 对比两边的顺序

【VASP 崩溃 OUTCAR 不完整】
- 读取报 KeyError / 帧数异常
- 解决：try-except 包裹跳过损坏文件，或改用 vasprun.xml 读取

【原子序数 vs 元素符号】
- to_vasp_poscar 默认按原子序数排序原子
- 需要保持原始顺序：to_vasp_poscar("POSCAR", direct=False) 或指定 sort=False
- LAMMPS data 导出时原子类型顺序默认按 type_map 自动分配

【重复帧】
- AIMD 长轨迹首帧/末帧可能重复
- 合并多段数据前先去重：比较 energy + forces 是否完全一致

【npy 与 raw 的选择】
- npy 格式（二进制）读取快、占空间小，推荐
- raw 格式（文本）可读、易调试，但慢且大`,
    url: "https://docs.deepmodeling.com/projects/dpdata/en/master/",
    tags: ["dpdata", "转换", "type_map", "常见坑", "OUTCAR"],
  },
  {
    id: "dpdata-training-data-check",
    source: "dpdata",
    title: "DeePMD 训练数据检查与可视化",
    summary: "用 dpdata 检查训练数据的能量/力范围、帧数、元素组成，发现问题数据",
    content: `训练前用 dpdata 检查数据质量：

【基本检查】
\`\`\`python
import dpdata
s = dpdata.LabeledSystem("data", fmt="deepmd/npy")

print("帧数:", len(s))
print("原子数:", s.get_natoms())
print("元素:", s.get_atom_names())
print("能量范围:", s.data['energies'].min(), "~", s.data['energies'].max())
print("力范围:", s.data['forces'].min(), "~", s.data['forces'].max())
\`\`\`

【异常检测】
- 能量明显超出物理范围（如 > 1e4 eV）→ 检查是否混入未收敛计算
- 力有 NaN/Inf → 用 numpy.isnan 检查
- 单帧原子数与 POSCAR 不符 → 结构有问题

【按帧过滤】
\`\`\`python
import numpy as np
# 过滤掉能量异常高的帧
e = s.data['energies']
good = np.where(e < 1e4)[0]
s2 = s.sub_system(good.tolist())
print(f"过滤后 {len(s2)} 帧")
\`\`\`

【训练前建议】
- 先打印一份数据摘要（帧数/元素/能量力范围）再训练
- 数据不平衡（某些元素占比过高）时考虑加权采样`,
    url: "https://docs.deepmodeling.com/projects/dpdata/en/master/",
    tags: ["dpdata", "训练数据", "检查", "可视化", "数据质量"],
  },
];
