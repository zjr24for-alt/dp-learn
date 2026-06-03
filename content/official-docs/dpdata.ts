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
];
