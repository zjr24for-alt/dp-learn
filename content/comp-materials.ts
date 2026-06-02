import type { Article } from "@/lib/types";

export const compMaterialsArticles: Article[] = [
  {
    slug: "dft-materials-intro",
    title: "DFT 与材料计算基础",
    category: "comp-materials",
    summary: "从实战角度理解 Kohn-Sham 方程、交换关联泛函、截断能收敛与 k 点采样，不做理论推导只讲怎么用",
    content: `# DFT 与材料计算基础

## 一句话理解 DFT

密度泛函理论（DFT）的核心思想：**不直接算 N 个电子的波函数（3N 维），而是算电子密度 ρ(r)（3 维）**。Hohenberg-Kohn 定理保证了 ρ(r) 包含基态所有信息，Kohn-Sham 方法把它变成了可实际计算的方程。

> 记忆：DFT = 用电子密度代替波函数，把 3N 维问题降为 3 维问题。

## Kohn-Sham 方程实战理解

不用背公式，记住这 4 项就够了：

\`\`\`text
KS 有效势 = 外势(V_ion) + Hartree势(V_H) + 交换关联势(V_xc)
\`\`\`

| 项 | 物理含义 | 计算代价 |
|----|---------|---------|
| 外势 V_ion | 原子核对电子的吸引 | 赝势/PAW 处理 |
| Hartree 势 V_H | 电子间经典库仑排斥 | FFT 可解 |
| 交换关联势 V_xc | 泡利不相容 + 量子关联修正 | **唯一的近似项！** |

**DFT 只有一个地方做了近似：交换关联泛函**。其他部分都是精确的。

## 交换关联泛函：Jacob's Ladder

\`\`\`text
精度 ↑
  第五阶: RPA / double-hybrid（极贵，小体系）
  第四阶: hybrid (HSE06, PBE0)（部分精确交换，半导体/表面）
  第三阶: meta-GGA (SCAN, r²SCAN)（包含动能密度）
  第二阶: GGA (PBE, PW91, PBEsol)（密度+梯度，主流）
  第一阶: LDA（仅密度，金属凑合能用）
\`\`\`

### 选型指南

| 体系 | 推荐泛函 | 原因 |
|------|---------|------|
| 金属/合金 | PBE | GGA 对金属表现稳健 |
| 半导体（带隙） | HSE06 | hybrid 修正带隙低估 |
| 固体弹性/晶格常数 | PBEsol | 专门优化固体平衡性质 |
| 分子/团簇 | PBE0 | hybrid 对分子能量好 |
| 强关联体系 | DFT+U (PBE+U) | 补 Hubbard U 修正 d/f 电子 |
| 范德华体系 | PBE-D3 / optB88-vdW | 加色散修正 |

## 截断能（ENCUT）收敛测试

平面波基组的多少由 ENCUT 决定。越大越精确，但越贵。

\`\`\`bash
# VASP: 对 ENCUT 做收敛测试
for ENCUT in 300 350 400 450 500 550 600; do
  mkdir encut_$ENCUT
  cp {INCAR,KPOINTS,POSCAR,POTCAR} encut_$ENCUT/
  sed -i "s/ENCUT = .*/ENCUT = $ENCUT/" encut_$ENCUT/INCAR
  cd encut_$ENCUT && mpirun -np 4 vasp_std && cd ..
done
# 比较各目录 OUTCAR 中的 total energy，差值 < 1 meV/atom 即收敛
\`\`\`

**经验值**：PBE 通常 ENCUT = max(ENMAX * 1.3, 400 eV)，其中 ENMAX 在 POTCAR 里查。

## k 点采样与收敛

k 点密度指导原则：

\`\`\`text
k_i × a_i ≈ 30–40 Å  （大多数计算）
k_i × a_i ≈ 20–25 Å  （初步粗算）
\`\`\`

其中 a_i 是晶格常数（Å），k_i 是该方向的 k 点数。

\`\`\`bash
# 用 VASPKIT 自动生成
vaspkit -task 102   # 生成 KPOINTS（输入 K 点密度）
\`\`\`

### 特殊 k 点类型

| 网格类型 | 适用场景 |
|---------|---------|
| Monkhorst-Pack (M) | 一般晶体 |
| Γ-centered (G) | 六方晶系、半导体带隙 |
| 高对称路径 | 能带计算 |

## 实战工作流

\`\`\`text
1. 拿到 POSCAR → 确认晶格参数
2. 查 POTCAR 中 ENMAX → 设 ENCUT = 1.3 × max(ENMAX)
3. 用 vaspkit 生成 KPOINTS（密度 ~40）
4. INCAR 基本参数（见下方模板）
5. 跑一次静态计算 → 检查 OUTCAR 能量和力
6. 做 ENCUT/k 点收敛 → 确认精度
\`\`\`

## INCAR 最小模板（PBE 静态计算）

\`\`\`bash
# 基础设置
ENCUT = 500
ISMEAR = 0      # 半导体用 0 (Gaussian)
SIGMA = 0.05
IBRION = -1     # 不做离子弛豫（静态）
NSW = 0
PREC = Accurate

# 电子步
NELM = 100
EDIFF = 1E-6

# 输出
LWAVE = .FALSE.
LCHARG = .FALSE.

# 如果是金属 → ISMEAR = 1 (Methfessel-Paxton)
\`\`\`

> 记忆口诀：**结构查 POSCAR、截断查 POTCAR、k 点查 vaspkit、泛函看体系**。
`,
    tags: ["DFT", "Kohn-Sham", "交换关联泛函", "ENCUT", "k点", "VASP", "收敛测试"],
    sourceFiles: ["dft-materials-intro.md"],
  },
  {
    slug: "band-structure-dos",
    title: "能带结构与态密度分析实战",
    category: "comp-materials",
    summary: "从 VASP 输出提取能带和态密度数据，用 Python 画图并解读电子结构特征（带隙/有效质量/轨道投影）",
    content: `# 能带结构与态密度分析实战

## 概念速览

| 概念 | 核心信息 | 类比 |
|------|---------|------|
| 能带结构 | E(k) 色散关系，告诉电子在晶体中能做什么 | 高速公路速度限制图 |
| 态密度 (DOS) | 在能量 E 附近有多少可用电子态 | 停车场每层有多少车位 |
| 费米能级 E_F | T=0 K 电子占据的最高能量 | 水位线 |
| 带隙 | 价带顶和导带底之间的能量差 | 绝缘区 |

## VASP 计算流程

\`\`\`text
Step 1: 结构优化（弛豫）
  INCAR: IBRION=2, ISIF=3, NSW=100
  → 得到平衡晶格常数

Step 2: 静态计算（自洽 SCF）
  INCAR: IBRION=-1, NSW=0, LCHARG=.TRUE.
  → 得到 CHGCAR（电荷密度）

Step 3: NSCF 能带计算
  INCAR: ICHARG=11, LCHARG=.FALSE.
  KPOINTS: 高对称路径（用 vaspkit 生成）
  → 得到 EIGENVAL

Step 4: DOS 计算
  INCAR: ICHARG=11, LORBIT=11, NEDOS=2000
  KPOINTS: 加密的 MP 网格
  → 得到 DOSCAR
\`\`\`

## KPOINTS 设置要点

### 能带计算（高对称路径）
\`\`\`bash
vaspkit -task 302   # 自动生成能带路径 KPOINTS
\`\`\`

### DOS 计算（加密网格）
\`\`\`bash
vaspkit -task 102   # 生成 KPOINTS，输入密度 0.03（比静态计算密 2-3 倍）
\`\`\`

## 用 Python 画能带 + DOS

\`\`\`python
import numpy as np
import matplotlib.pyplot as plt
from pymatgen.io.vasp import Vasprun, BSVasprun

# --- 读取能带 ---
bs = BSVasprun("band/vasprun.xml").get_band_structure()
# bs.bands[spin][band_idx] 形状: (n_kpoints,)

# --- 读取 DOS ---
dosrun = Vasprun("dos/vasprun.xml")
dos = dosrun.complete_dos
# dos.energies, dos.densities[spin] 形状: (n_energies,)

# --- 画图 ---
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5), gridspec_kw={'width_ratios': [3, 1]})

# 能带图
for band in bs.bands[0]:
    ax1.plot(range(len(band)), band - bs.efermi, 'b-', lw=0.8)
ax1.axhline(y=0, color='r', ls='--', lw=1, label='E_F')
ax1.set_ylabel('E - E_F (eV)')
ax1.set_xticks(bs.get_kpoint_indices())
ax1.set_xticklabels([l.replace('GAMMA', 'Γ') for l in bs.kpoints_labels])
ax1.set_ylim(-5, 5)

# DOS 图
ax2.plot(dos.densities[0], dos.energies - dos.efermi, 'b-')
ax2.axhline(y=0, color='r', ls='--', lw=1)
ax2.set_xlabel('DOS')
ax2.set_ylim(-5, 5)

plt.tight_layout()
plt.savefig('band_dos.png', dpi=300)
\`\`\`

## 能带/DOS 解读

### 带隙类型
| 类型 | k 空间特征 | 材料举例 |
|------|----------|---------|
| 直接带隙 | VBM 和 CBM 在同一 k 点 | GaAs, MAPbI₃ |
| 间接带隙 | VBM 和 CBM 在不同 k 点 | Si, Ge, TiO₂ |

### 有效质量
\`\`\`text
m* = ℏ² / (d²E/dk²)
\`\`\`

从能带曲率判断：
- **平带** → 大有效质量 → 电子"重"（d/f 电子）
- **陡带** → 小有效质量 → 电子"轻"（s/p 电子）

### DOS 中看什么
\`\`\`text
1. 费米能级附近是否为零 → 判断金属/绝缘体
2. 带隙大小（VBM-CBM 距离）
3. 轨道投影 → s, p, d 轨道贡献占比
4. 峰高低 → 态密度集中程度（van Hove 奇点）
\`\`\`

## 轨道投影 DOS（pDOS）

INCAR 设置：
\`\`\`bash
LORBIT = 11    # 输出 lm 分解的 DOS（PROCAR）
\`\`\`

用 pymatgen 提取 pDOS 画堆叠图：
\`\`\`python
from pymatgen.io.vasp import Vasprun

dosrun = Vasprun("vasprun.xml")
pdos = dosrun.complete_dos.get_element_dos()
# pdos['Ti'].densities, pdos['Ti'].energies → 按元素/轨道绘制
\`\`\`

> 实战技巧：做能带前一定先做精细弛豫！能带对晶格常数非常敏感，结构差 0.5% 能带能差出 0.1-0.2 eV。
`,
    tags: ["能带结构", "态密度", "DOS", "电子结构", "VASP", "pymatgen", "带隙"],
    sourceFiles: ["band-structure-dos.md"],
  },
  {
    slug: "elastic-constants-dft",
    title: "DFT 计算弹性常数与力学性质",
    category: "comp-materials",
    summary: "应力-应变法计算弹性常数矩阵 Cij，通过 VRH 近似推导体模量/剪切模量/杨氏模量和泊松比",
    content: `# DFT 计算弹性常数与力学性质

## 弹性常数矩阵

对于一般晶体，弹性常数是 6×6 矩阵 Cij（Voigt 记号）：

\`\`\`text
应力 σ_i = Σ_j C_{ij} × 应变 ε_j    (i,j = 1..6)
\`\`\`

其中 1=xx, 2=yy, 3=zz, 4=yz, 5=xz, 6=xy。

### 不同晶系的独立 Cij

| 晶系 | 独立 Cij 数 | 关键分量 |
|------|------------|---------|
| 立方 | 3 | C11, C12, C44 |
| 六方 | 5 | C11, C12, C13, C33, C44 |
| 四方 | 6 | C11, C12, C13, C33, C44, C66 |
| 正交 | 9 | 全部非对角线对 |
| 三斜 | 21 | 全部可能 |

## 应力-应变法流程

\`\`\`text
1. 完全弛豫结构 → 得到平衡晶格
2. 对每种应变模式施加 ±1%, ±2% 应变
3. 对每个变形结构做静态计算 → 提取应力张量
4. 用 σ = C·ε 线性拟合求 Cij
\`\`\`

## VASP 实现

### Step 1: 弛豫
\`\`\`bash
# INCAR 弛豫设置
IBRION = 2
ISIF = 3       # 同时优化原子位置+晶格+体积
NSW = 100
EDIFFG = -0.001 # 力收敛标准 eV/Å
ENCUT = 1.3 × ENMAX   # 略高于通常值（弹性对截断能敏感）
PREC = Accurate
\`\`\`

### Step 2: VASP 应变计算
\`\`\`bash
# INCAR 弹性常数直接计算（IBRION=6 应力-应变法）
IBRION = 6
ISIF = 3
NFREE = 2      # 每个方向 ±2 个位移
POTIM = 0.015  # 位移幅度 Å
\`\`\`

VASP 会自动施加对称应变，从 OUTCAR 提取：

\`\`\`bash
grep "TOTAL ELASTIC MODULI" OUTCAR -A 20
\`\`\`

### Step 3: 手动提取（如需更高精度）

对每个晶格向量施加小幅应变：

\`\`\`python
import numpy as np

# 对 POSCAR 的晶格矩阵施加单轴/剪切应变
def apply_strain(lattice, strain_type, delta):
    """
    strain_type: 'xx', 'yy', 'zz', 'yz', 'xz', 'xy'
    delta: 应变大小 (如 0.01 = 1%)
    """
    eps = np.zeros((3, 3))
    if strain_type == 'xx': eps[0, 0] = delta
    elif strain_type == 'yy': eps[1, 1] = delta
    elif strain_type == 'zz': eps[2, 2] = delta
    elif strain_type == 'yz': eps[1, 2] = eps[2, 1] = delta / 2
    elif strain_type == 'xz': eps[0, 2] = eps[2, 0] = delta / 2
    elif strain_type == 'xy': eps[0, 1] = eps[1, 0] = delta / 2
    return lattice @ (np.eye(3) + eps)

# 对 delta = -0.02, -0.01, 0.01, 0.02 各跑一次静态
# 提取应力张量 → 线性拟合 → Cij
\`\`\`

## 从 Cij 到工程弹性模量

### Voigt-Reuss-Hill (VRH) 近似

\`\`\`python
import numpy as np

def calc_moduli_vrh(C):
    """立方晶系 VRH 平均"""
    C11, C12, C44 = C[0,0], C[0,1], C[3,3]

    # Voigt 上界 (等应变假设)
    B_V = (C11 + 2*C12) / 3
    G_V = (C11 - C12 + 3*C44) / 5

    # Reuss 下界 (等应力假设)
    S = np.linalg.inv(C)  # 柔度矩阵
    S11, S12, S44 = S[0,0], S[0,1], S[3,3]
    B_R = 1 / (3*S11 + 6*S12)
    G_R = 5 / (4*S11 - 4*S12 + 3*S44)

    # Hill 平均
    B_H = (B_V + B_R) / 2
    G_H = (G_V + G_R) / 2

    # 杨氏模量和泊松比
    E = 9*B_H*G_H / (3*B_H + G_H)
    nu = (3*B_H - 2*G_H) / (2*(3*B_H + G_H))

    return {
        'B_V': B_V, 'B_R': B_R, 'B_H': B_H,  # GPa
        'G_V': G_V, 'G_R': G_R, 'G_H': G_H,  # GPa
        'E': E,                                 # GPa
        'nu': nu,
        'B_G_ratio': B_H / G_H                 # Pugh 判据
    }
\`\`\`

### Pugh 判据与机械稳定性

| 判据 | 条件 | 含义 |
|------|------|------|
| Pugh 比 B/G | > 1.75 → 延性 | 体模量 vs 剪切模量 |
| | < 1.75 → 脆性 | |
| Cauchy 压力 C12 - C44 | > 0 → 金属键/延性 | 角向键强度 |
| | < 0 → 共价键/脆性 | |

**Born 稳定性判据（立方晶系）：**
\`\`\`text
C11 - C12 > 0
C11 + 2C12 > 0  （即 B > 0）
C44 > 0
\`\`\`

## 实战注意

1. **截断能要足够高**：弹性常数对 ENCUT 敏感，推荐 ENCUT = 1.5 × max(ENMAX)
2. **k 点要加密**：推荐密度 ≥ 40 Å
3. **应变幅度要收敛**：试 0.5%, 1%, 2%，选 Cij 不随幅度变化的最小值
4. **结构的 Ising 效应**：弛豫要收敛到每原子受力 < 0.001 eV/Å
`,
    tags: ["弹性常数", "Cij", "VRH", "体模量", "剪切模量", "杨氏模量", "Pugh判据"],
    sourceFiles: ["elastic-constants-dft.md"],
  },
  {
    slug: "phonon-thermodynamics",
    title: "声子谱与热力学性质计算",
    category: "comp-materials",
    summary: "有限位移法 + Phonopy 计算声子色散、态密度，从声子 DOS 推导自由能/热容/熵的温度依赖性",
    content: `# 声子谱与热力学性质计算

## 为什么算声子

| 性质 | 从声子得到什么 |
|------|-------------|
| 动力学稳定性 | 无虚频 → 结构是势能面局部极小 |
| 热容 Cv(T) | 声子 DOS 积分 → 低温 T³ 律，高温 Dulong-Petit |
| 自由能 F(T) | F = E_DFT + F_vib(T) → 相稳定性 |
| 熵 S(T) | 振动熵 → 相变驱动力 |
| 红外/Raman 活性 | Γ 点振动模式对称性 |

## 两种计算方法

| 方法 | 原理 | 优点 | 缺点 |
|------|------|-----|------|
| 有限位移法 (Frozen Phonon) | 对每个原子施加小位移 → 算力 → 得力常数矩阵 | 简单通用，所有 DFT 代码可用 | 需要超胞，k 点不密集 |
| DFPT (密度泛函微扰) | 线性响应直接算动力学矩阵 | 不需要超胞，任意 q 点 | 实现复杂，部分代码不支持 |

**实战推荐**：VASP + Phonopy（有限位移法），最稳。

## Phonopy 工作流

\`\`\`text
Step 1: 弛豫原胞 → 目标：力 < 1E-5 eV/Å
         INCAR: IBRION=-1, NSW=0 或精细弛豫 IBRION=2
         → 得到稳定的 POSCAR

Step 2: 生成超胞和位移结构
         phonopy -d --dim="2 2 2" -c POSCAR
         → SPOSCAR (超胞) + POSCAR-001, POSCAR-002, ...

Step 3: 对每个位移结构做 VASP 静态计算 → 收集 forces (vasprun.xml)

Step 4: 提取力常数
         phonopy -f disp-*/vasprun.xml
         → FORCE_CONSTANTS

Step 5: 计算声子色散/DOS/热力学
         phonopy -p band.conf -c POSCAR
         phonopy -p dos.conf -c POSCAR
         phonopy -t -p thermo.conf -c POSCAR
\`\`\`

## 超胞尺寸收敛

\`\`\`bash
# 测试 dim="2 2 2" vs "3 3 3" vs "4 4 4"
# 声子频率变化 < 1 cm⁻¹ 即可
for dim in "2 2 2" "3 3 3" "4 4 4"; do
  phonopy -d --dim="$dim" -c POSCAR
  # 算 VASP，收集 force，比较 Γ 点频率
done
\`\`\`

## 关键配置文件

### band.conf
\`\`\`text
ATOM_NAME = Ti C
DIM = 2 2 2
BAND = 0.0 0.0 0.0  0.5 0.0 0.0  0.333 0.333 0.0  0.0 0.0 0.0
BAND_LABELS = Γ X K Γ
BAND_POINTS = 101
FORCE_CONSTANTS = READ
\`\`\`

### thermo.conf (mesh.conf)
\`\`\`text
DIM = 2 2 2
MP = 20 20 20    # q 点网格密度 → 越大热力学越精确
FORCE_CONSTANTS = READ
\`\`\`

## 声子色散/DOS 解读

### 虚频问题
- **Γ 点有较小虚频（< 1 cm⁻¹）**：可能数值噪声，忽略或增大超胞
- **遍布布里渊区的虚频**：结构不稳定！需要重新弛豫或考虑软模相变
- **偏离 Γ 点的虚频**：CDW（电荷密度波）或结构相变的信号

### 声子 DOS 特征
\`\`\`text
低频区 (0-200 cm⁻¹)：重原子、声学支 → Debye 模型
中频区 (200-600 cm⁻¹)：键弯曲、较轻原子
高频区 (> 600 cm⁻¹)：轻原子—轻原子键伸缩 (C-H, O-H, etc.)
\`\`\`

## 热力学性质后处理

Phonopy 输出 thermal_properties.yaml 包含：

\`\`\`python
import yaml
import matplotlib.pyplot as plt

with open('thermal_properties.yaml') as f:
    data = yaml.safe_load(f)

T = [d['temperature'] for d in data['thermal_properties']]
F = [d['free_energy'] for d in data['thermal_properties']]     # kJ/mol
Cv = [d['heat_capacity'] for d in data['thermal_properties']]  # J/K/mol
S = [d['entropy'] for d in data['thermal_properties']]         # J/K/mol

fig, axes = plt.subplots(1, 3, figsize=(15, 4))
axes[0].plot(T, F); axes[0].set_ylabel('Free Energy (kJ/mol)')
axes[1].plot(T, Cv); axes[1].set_ylabel('Cv (J/K/mol)')
axes[2].plot(T, S); axes[2].set_ylabel('Entropy (J/K/mol)')
for ax in axes: ax.set_xlabel('T (K)')
plt.tight_layout()
\`\`\`

## 实战注意

1. **弛豫到极致**：力收敛标准要 ≤ 1E-5 eV/Å，不然虚频可能是残余应力造成的
2. **ENCUT 保持一致**：Phonopy 的所有位移结构要使用相同的 ENCUT（包括弛豫阶段）
3. **POTCAR 不要换**：所有计算从头到尾用同一个 POTCAR
4. **超胞越大声子越准**：2×2×2 是最小要求，3×3×3 是实际推荐
5. **非极性半导体注意**：LO-TO 劈裂需要 Born 有效电荷修正
`,
    tags: ["声子", "Phonopy", "热力学", "有限位移", "晶格动力学", "自由能"],
    sourceFiles: ["phonon-thermodynamics.md"],
  },
];
