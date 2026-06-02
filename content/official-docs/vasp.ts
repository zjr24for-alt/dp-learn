import type { DocEntry } from "@/lib/types";

export const vaspDocs: DocEntry[] = [
  {
    id: "vasp-incar-tags",
    source: "vasp",
    title: "INCAR 标签完整参考",
    summary: "VASP INCAR 中所有标签的详细说明，包括电子步、离子步、并行化等",
    content: `INCAR 中常用标签分类：

【电子步控制】
- ENCUT: 平面波截断能 (eV)，推荐 = 1.3 * POTCAR 中最大 ENMAX
- EDIFF: 电子步收敛标准 (eV)，默认 1e-4
- NELM: 最大电子步数，默认 60
- ISMEAR: 展宽方法 (0=Gaussian, 1=MP, -1=Fermi, -5=tetrahedron)
- SIGMA: 展宽宽度 (eV)

【离子步控制】
- NSW: 最大离子步数
- IBRION: 优化算法 (-1=固定, 0=MD, 1=准牛顿, 2=共轭梯度)
- EDIFFG: 离子步收敛标准 (正=能量, 负=力)
- ISIF: 自由度控制 (2=离子, 3=离子+体积, 4=离子+形状)

【并行化】
- NCORE: 并行核数 (影响 FFT 效率)
- KPAR: K 点并行
- NPAR: 轨道并行 (=总核数/NCORE/KPAR)

【输出控制】
- LCHARG: 是否写 CHGCAR
- LWAVE: 是否写 WAVECAR`,
    url: "https://www.vasp.at/wiki/index.php/Category:INCAR_tag",
    tags: ["vasp", "INCAR", "参数", "电子步", "离子步"],
  },
  {
    id: "vasp-kpoints-guide",
    source: "vasp",
    title: "KPOINTS 与 KSPACING 设置指南",
    summary: "VASP 中 K 点采样的两种方式：KPOINTS 文件 vs KSPACING 自动生成",
    content: `K 点设置有两种互斥的方式：

【方式一：KPOINTS 文件】
- 格式：Gamma-centered 或 Monkhorst-Pack
- 网格必须为整数（如 1 1 1, 2 2 2）
- DP-GEN 生成时有 float bug，建议手动提供

【方式二：KSPACING（推荐用于 VASP 5.4+）】
- 在 INCAR 中设置 KSPACING = 0.15（约对应 2π×0.15 的 k 点密度）
- VASP 根据晶胞大小自动确定网格
- DP-GEN 默认使用此方式
- 配合 KGAMMA = .TRUE. 使用 Gamma-centered 网格

【K 点测试】
- 通常以总能量收敛 1 meV/atom 为标准
- 越来越密的 K 点直到能量不再变化`,
    url: "https://www.vasp.at/wiki/index.php/KPOINTS",
    tags: ["vasp", "KPOINTS", "KSPACING", "K点"],
  },
  {
    id: "vasp-common-errors",
    source: "vasp",
    title: "VASP 常见报错与解决",
    summary: "VASP 运行中最常见的报错信息、原因和解决方法",
    content: `常见 VASP 报错：

【BRMIX: very serious problems / the old and the new charge density differ】
- 电子步不收敛
- 解决：降低 AMIX (如 0.02), 增加 BMIX (如 2.0), 改用 ALGO=Normal

【SIGSEGV / segmentation fault】
- 库依赖问题（conda 污染最常见）
- 解决：unset LD_LIBRARY_PATH, 干净 shell 运行

【Error reading KPOINTS file / I REFUSE TO CONTINUE WITH THIS SICK JOB】
- KPOINTS 格式错误（如浮点数网格）
- 解决：确保 KPOINTS 网格为整数

【WARNING: Sub-Space-Matrix is not hermitian】
- 通常无害，SCF 收敛即可忽略
- 如果导致不收敛：尝试 ALGO=Normal 或降低 SIGMA

【reached required accuracy - stopping structural energy minimisation】
- 这不是报错！是离子步成功收敛的标志`,
    url: "https://www.vasp.at/wiki/index.php/Category:Troubleshooting",
    tags: ["vasp", "报错", "调试", "SIGSEGV", "收敛"],
  },
  {
    id: "vasp-potcar-guide",
    source: "vasp",
    title: "POTCAR / 赝势选择指南",
    summary: "VASP 赝势类型（PBE/PBEsol/LDA）的选择和 POTCAR 生成方法",
    content: `POTCAR（赝势文件）是 VASP 计算的核心输入。

【赝势类型】
- PBE: 最常用，适合大多数体系（推荐）
- PBEsol: 改进的 PBE，更好描述固体的平衡体积
- LDA: 旧标准，高估结合能，仅用于兼容旧文献

【POTCAR 版本】
- 普通版: Ti, Ti_sv, Ti_pv（价电子数不同）
- _sv: semi-core，包含半芯态
- _pv: 更多价电子，更精确但更贵
- _GW: 用于 GW 计算

【生成方法】
cat POTCAR_Ti POTCAR_C > POTCAR
元素顺序必须与 POSCAR 一致！

【选择原则】
- 有磁性（3d 过渡金属）：推荐 _pv 或 _sv
- 碱金属/碱土金属：普通版即可
- 精度要求高（弹性常数等）：选价电子多的版本`,
    url: "https://www.vasp.at/wiki/index.php/Available_pseudopotentials",
    tags: ["vasp", "POTCAR", "赝势", "PBE"],
  },
];
