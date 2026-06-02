import type { Article } from "@/lib/types";

export const atomisticSimArticles: Article[] = [
  {
    slug: "md-fundamentals",
    title: "分子动力学模拟基础与实战要点",
    category: "atomistic-sim",
    summary: "Verlet 积分、系综选择、thermostat/barostat 原理、timestep 选择、平衡判断，从零理解 MD 核心概念",
    content: `# 分子动力学模拟基础与实战要点

## MD 在做什么

\`\`\`text
给定 N 个原子的初始位置和速度
  → 每步算力 F_i = -∂U/∂r_i
  → 牛顿方程 a_i = F_i/m_i
  → 更新位置 r(t+Δt) 和速度 v(t+Δt)
  → 重复（通常 10⁴ ~ 10⁷ 步）
\`\`\`

MD 不包含电子，只是原子的"台球运动"——力来自**原子间势函数**（力场或 ML 势）。

## Verlet 积分算法

标准 velocity-Verlet 算法：

\`\`\`text
v(t + Δt/2) = v(t) + a(t)·Δt/2
r(t + Δt)   = r(t) + v(t + Δt/2)·Δt
a(t + Δt)   = F(r(t+Δt)) / m
v(t + Δt)   = v(t + Δt/2) + a(t + Δt)·Δt/2
\`\`\`

**优点**：时间可逆、辛结构（能量长期守恒）、实现简单。

## Timestep 选择

| 体系 | 推荐 Δt | 最快运动 |
|------|--------|---------|
| 原子/金属（重原子） | 1.0 fs | C-H 伸缩 ~10 fs |
| 含 H 的有机分子 | 0.5 fs | O-H 伸缩 ~10 fs |
| 粗粒化模型 | 10-50 fs | 珠子扩散 |
| 含离子液体 | 0.25 fs | H⁺ 跳跃 |

**铁律**：Δt ≤ 最快振动周期的 1/10。C-H 伸缩 ~3000 cm⁻¹ → 周期 ~10 fs → Δt ≤ 1 fs。

> 如果总能量随时间剧烈漂移（> 1%），缩小 timestep。

## 系综（Ensemble）

| 系综 | 守恒量 | 用法 |
|------|--------|------|
| NVE (微正则) | 粒子数 N, 体积 V, 总能量 E | 测试能量守恒、平衡检查后 |
| NVT (正则) | N, V, 温度 T | 升温、恒温弛豫 |
| NPT (等温等压) | N, 压强 P, T | 密度优化、相变、实际工况 |

**标准流程**：NVT 弛豫 → NPT 调密度 → NVT 生产 → NVE 采样（如需）。

## Thermostat（恒温器）对比

| 恒温器 | 原理 | 适用场景 | 注意 |
|--------|------|---------|------|
| Nosé-Hoover | 扩展 Lagrangian | 平衡态采样最佳 | 对小体系/高频体系可能不够强 |
| Langevin | 摩擦力 + 随机力 | 非平衡、界面、冲击 | 会扰动动力学，扩散偏慢 |
| Berendsen | 速度重标 | 快速平衡 | **不产生正确 NVT 系综！**仅用于弛豫 |
| CSVR (Bussi) | 随机重标 | 正确 NVT 系综 | LAMMPS 新版推荐 |

## Barostat（恒压器）

| 恒压器 | 原理 | 适用场景 |
|--------|------|---------|
| Parrinello-Rahman | 扩展 Lagrangian | 平衡态 NPT |
| Berendsen | 直接缩放 | 快速平衡，**非正确 NPT** |

## 平衡判断清单

\`\`\`text
☐ 温度在目标值 ± 5% 内振荡（无漂移）
☐ 压强（NPT）在目标值附近稳定振荡
☐ 总能量守恒（NVE）或仅小幅漂移
☐ 势能/动能比 ~ 1（平衡）
☐ 观察量（RDF、MSD）不再随时间系统变化
\`\`\`

\`\`\`bash
# 快速检查 LAMMPS 温度走势
grep "^[0-9]" log.lammps | awk '{print $1, $4}'  # Timestep vs Temp
# 用 gnuplot/python 画图看是否平稳
\`\`\`

## 实战调参

| 问题 | 可能原因 | 解决 |
|------|---------|------|
| 总能量剧烈漂移 | Δt 太大 | 减半 timestep |
| 温度一直涨 | 弛豫不够 | 先 NVT + Langevin 弛豫 100ps |
| 密度不合理 | NPT 时间不够 | 延长 NPT 到 500ps+ |
| 原子飞出盒子 | 力发散 | 检查初始结构（原子重叠？） |
| 计算太慢 | 截断半径太大 | 检查 pair_style cutoff |

> 初始结构里的"坏接触"（原子重叠）是 MD 爆炸的第一大原因。用能量最小化（minimize）先预弛豫。
`,
    tags: ["分子动力学", "MD", "Verlet", "系综", "恒温器", "平衡", "timestep"],
    sourceFiles: ["md-fundamentals.md"],
  },
  {
    slug: "lammps-input-practical",
    title: "LAMMPS 输入文件编写实战",
    category: "atomistic-sim",
    summary: "完整 LAMMPS input 模板：单位系统、势函数选择、能量最小化、弛豫、生产运行、轨迹分析全流程",
    content: `# LAMMPS 输入文件编写实战

## LAMMPS input 四段式

\`\`\`text
1. 初始化     → units, dimension, boundary, atom_style, ...
2. 体系定义   → read_data 或 create_box + create_atoms
3. 相互作用   → pair_style, pair_coeff, bond_style, ...
4. 运行       → minimize, fix, thermo, dump, run
\`\`\`

## 完整 LAMMPS 模板（金属体系 EAM）

\`\`\`lammps
# ====== 1. 初始化 ======
units          metal
dimension      3
boundary       p p p
atom_style     atomic

# ====== 2. 读入结构 ======
read_data      structure.lmp

# ====== 3. 势函数 ======
pair_style     eam/alloy
pair_coeff     * * FeNiCr.eam.alloy Fe Ni Cr

# ====== 4. 输出 ======
thermo         100
thermo_style   custom step temp pe ke etotal press vol density
dump           mydump all custom 1000 dump.lammpstrj id type x y z

# ====== 5. 能量最小化（先清除坏接触）======
minimize       1.0e-10 1.0e-10 10000 100000

# ====== 6. NVT 弛豫 ======
velocity       all create 300 12345 dist gaussian
fix            nvt all nvt temp 300 300 $(100*dt)
timestep       0.001   # 1 fs (metal units → ps)
run            50000   # 50 ps 弛豫

# ====== 7. NPT 调密度（可选）======
unfix          nvt
fix            npt all npt temp 300 300 $(100*dt) iso 0.0 0.0 $(1000*dt)
run            100000  # 100 ps

# ====== 8. NVE 生产 ======
unfix          npt
fix            nve all nve
reset_timestep 0
run            500000  # 500 ps 生产，采样数据
\`\`\`

## 单位系统选择

| units | 能量 | 长度 | 时间 | 适用 |
|-------|------|------|------|------|
| **metal** | eV | Å | ps | 金属、半导体、DFT |
| real | kcal/mol | Å | fs | 生物、有机、经典力场 |
| si | J | m | s | 粗粒化、宏观 |
| lj | ε | σ | τ | Lennard-Jones |

> 和 VASP/DFT 对接：用 **metal** 单位。

## 势函数选型

| 体系类型 | pair_style | 说明 |
|---------|------------|------|
| 金属/合金 | eam/alloy | 嵌入原子势（需要 .eam.alloy 文件） |
| 通用化学体系 | reaxff | 反应力场（能断键/成键） |
| 氧化物/陶瓷 | buck/coul/long | Buckingham + 库仑长程 |
| 水/生物分子 | lj/cut/coul/long + tip4p | Lennard-Jones + 长程静电 |
| DeePMD 势 | deepmd | \`pair_style deepmd graph.pb\` |
| LJ 测试 | lj/cut | Lennard-Jones 12-6 截断 |

## 常用 fix 大全

\`\`\`lammps
# 恒温
fix 1 all nvt temp 300 300 0.1       # Nosé-Hoover NVT
fix 1 all langevin 300 300 0.1 12345 # Langevin

# 恒压
fix 1 all npt temp 300 300 0.1 iso 0 0 1.0  # NPT 各向同性
fix 1 all npt temp 300 300 0.1 aniso 0 0 1.0 # NPT 各向异性

# 变形
fix 1 all deform 1 x erate 0.001     # x 方向恒定应变率

# 统计
fix 1 all ave/time 100 10 1000 ...   # 块平均
compute msd all msd                   # 均方位移（扩散系数）
compute rdf all rdf 100               # 径向分布函数
\`\`\`

## 后处理 Python 模板

\`\`\`python
import numpy as np
import matplotlib.pyplot as plt

# 读取 LAMMPS dump 文件（用 ovito 或自己解析）
from ovito.io import import_file
from ovito.modifiers import CoordinationAnalysisModifier

pipeline = import_file("dump.lammpstrj")

# 读取 log 文件
log = np.loadtxt("log.lammps", skiprows=1)
step, temp, pe, ke, etotal, press = log[:,0], log[:,4], log[:,5], log[:,6], log[:,7], log[:,8]

fig, axes = plt.subplots(2, 2, figsize=(12, 8))
axes[0,0].plot(step, temp); axes[0,0].set_ylabel("T (K)")
axes[0,1].plot(step, etotal); axes[0,1].set_ylabel("E_total (eV)")
axes[1,0].plot(step, press/10000); axes[1,0].set_ylabel("P (GPa)")
axes[1,1].plot(step, pe, label='PE'); axes[1,1].plot(step, ke, label='KE')
axes[1,1].legend()
plt.tight_layout()
# 保存图像用于检查平衡
\`\`\`

## 常见报错排查

| 报错 | 原因 | 解决 |
|------|------|------|
| \`Lost atoms\` | 原子飞出模拟盒 | 减小 timestep、先 minimize |
| \`Out of range atoms\` | 近邻列表溢出 | 增大 skin 距离 |
| \`Non-numeric pressure\` | 力发散 | 检查原子重叠、势函数参数 |
| \`Incorrect pair_style\` | 势函数和 atom_style 不匹配 | 检查手册要求 |
| \`Bond atoms missing\` | 键合拓扑残缺 | 检查 data 文件的 Bonds 段 |

> 跑 MD 之前**永远先 minimize**，这是血的教训。
`,
    tags: ["LAMMPS", "input", "MD", "势函数", "EAM", "轨迹分析", "dump"],
    sourceFiles: ["lammps-input-practical.md"],
  },
  {
    slug: "mc-materials-science",
    title: "蒙特卡洛方法在材料科学中的应用",
    category: "atomistic-sim",
    summary: "Metropolis 算法原理、巨正则 MC、半巨正则 MC、与 MD 的互补关系，附 Python 示例",
    content: `# 蒙特卡洛方法在材料科学中的应用

## MC vs MD

| 特性 | MD（分子动力学） | MC（蒙特卡洛） |
|------|---------------|-------------|
| 采样原理 | 牛顿运动方程，真实性动力学 | 随机行走 + 接受概率，无真实动力学 |
| 时间信息 | ✅ 有 | ❌ 无（只有 Monte Carlo "步"） |
| 跨越能垒 | ❌ 被困在局域极小 | ✅ 可接受高能态 |
| 适用系综 | NVE/NVT/NPT | 任意 |
| 计算速度 | 需要力（每步） | 只需能量（每次尝试） |
| 典型用途 | 动力学、输运、振动谱 | 相平衡、吸附等温线、合金有序化 |

**互补关系**：MD 看"怎么动"，MC 看"能去哪"。

## Metropolis 算法

\`\`\`text
1. 随机选择原子/分子，提议新位置
2. 计算能量差 ΔE = E_new - E_old
3. 如果 ΔE ≤ 0 → 接受
   如果 ΔE > 0 → 以概率 exp(-ΔE/kT) 接受（即有一定概率上坡）
4. 重复 N 次 → 1 个 MC 循环
\`\`\`

\`\`\`python
import numpy as np

def metropolis_mc(initial_config, n_steps, T, displacement=0.1):
    """简单 NVT Metropolis MC"""
    kT = 8.617333262e-5 * T  # eV/K → eV
    config = initial_config.copy()
    E = energy(config)
    accepted = 0

    for step in range(n_steps):
        # 随机位移一个原子
        i = np.random.randint(len(config))
        old_pos = config[i].copy()
        config[i] += displacement * (2*np.random.rand(3) - 1)

        E_new = energy(config)
        dE = E_new - E

        if dE <= 0 or np.random.rand() < np.exp(-dE / kT):
            E = E_new
            accepted += 1
        else:
            config[i] = old_pos  # 拒绝，恢复

    acceptance_rate = accepted / n_steps
    print(f"Acceptance: {acceptance_rate:.1%}  (目标 30-50%)")
    return config, acceptance_rate
\`\`\`

> 调节 displacement 使接受率在 30-50%。太小则探索慢，太大则很少接受。

## MC 系综类型

| 系综 | 尝试的 MC 移动 | 材料学应用 |
|------|--------------|-----------|
| NVT (Canonical) | 原子位移 | 缺陷能量、短程有序 |
| NPT | 位移 + 体积变化 | 相变压力 |
| μVT (Grand Canonical, GCMC) | 位移 + 插入/删除原子 | **吸附等温线** |
| Semi-Grand | 位移 + 原子类型互换 | **合金相图** |

## GCMC 吸附等温线示例

\`\`\`python
# GCMC 伪代码：在 MOF/沸石框架中吸附气体
chemical_potential = mu  # 气体的化学势（由 NIST 或 Peng-Robinson 方程得）

for mc_cycle in range(n_cycles):
    for _ in range(n_moves):
        move_type = np.random.choice(['displace', 'insert', 'delete'])
        if move_type == 'displace':
            # 随机位移一个分子
            ...
        elif move_type == 'insert':
            # 在随机位置插入一个气体分子
            new_E = energy(config_with_new)
            # 接受概率含化学势项
            p_acc = V / (Λ³*(N+1)) * exp(-(new_E - E - mu) / kT)
        elif move_type == 'delete' and N > 0:
            # 随机删除一个气体分子
            ...
\`\`\`

## 高级 MC 方法

| 方法 | 解决什么问题 |
|------|------------|
| Replica Exchange (Parallel Tempering) | 低温下逃逸局域极小 |
| Wang-Landau | 直接计算态密度（无需先验知识） |
| Umbrella Sampling | 沿反应坐标的精确自由能面 |
| Hybrid MD/MC | MD 做动力学 + MC 做稀有事件 |

## 何时用 MC 而非 MD

\`\`\`text
✅ 吸附/脱附/扩散（GCMC 是黄金标准）
✅ 合金有序-无序相变（Semi-Grand MC）
✅ 离子导体中空位跳跃
✅ 跨越秒级-年级的慢过程（动力 MC / kMC）
❌ 需要振动谱、声子、比热 Cv（用 MD）
❌ 输运性质（扩散系数 → MD + Einstein 关系）
\`\`\`

> MC 的最大优势是**不需要真实的动力学时间**——可以用"MC 步"高效探索构型空间。
`,
    tags: ["蒙特卡洛", "MC", "Metropolis", "GCMC", "吸附等温线", "相变"],
    sourceFiles: ["mc-materials-science.md"],
  },
  {
    slug: "ml-potentials-overview",
    title: "机器学习势函数全景概述",
    category: "atomistic-sim",
    summary: "DeePMD、ACE、MTP、GAP、NNP 五大 ML 势函数架构对比、选型指南、精度-速度-数据效率三角权衡",
    content: `# 机器学习势函数全景概述

## 为什么要 ML 势

| 方法 | 精度 | 速度 (atom·step) | 可跑体系 |
|------|------|-----------------|---------|
| DFT (VASP/QE) | 最高 | ~1 sec | ~100 atoms |
| 经典力场 (EAM/ReaxFF) | 中 | ~1 μs | ~10⁶ atoms |
| **ML 势** | **接近 DFT** | **~1-10 ms** | **~10⁵ atoms** |

**ML 势 = DFT 精度 + 经典力场速度**（前提：在训练域内）。

## 五大路线对比

| | DeePMD | ACE | MTP | GAP | NNP (NequIP/MACE) |
|---|---|---|---|---|---|
| **架构** | 前馈 NN | 原子簇展开（线性） | 线性基函数展开 | 高斯过程回归 | 等变消息传递 NN |
| **精度** | ★★★★ | ★★★★ | ★★★★ | ★★★★★ | ★★★★★ |
| **速度** | ★★★★ | ★★★★★ | ★★★★ | ★★ | ★★★ |
| **数据效率** | ★★★ | ★★★★ | ★★★★ | ★★★★★ | ★★★ |
| **外推能力** | ★★★ | ★★★ | ★★★ | ★★★★★ | ★★ |
| **多体描述** | 隐式 | 显式体序展开 | 显式 | 显式核函数 | 隐式+等变性 |
| **典型软件** | DeepMD-kit | PACE, Julia-ACE | MLIP | QUIP/GAP | NequIP, MACE, Allegro |

## 选型决策树

\`\`\`text
数据量 > 10⁵ 帧，体系 > 1000 atoms → DeePMD（速度+可扩展性）
数据量 < 10³ 帧，追求极致精度 → GAP（数据效率）
中等数据，需要快速迭代 → ACE 或 MTP（训练快）
需要跑大应变/极端条件 → GAP（外推最好）或 ACE（显式多体）
周期性晶体，做声子/弹性 → 任意（都行），优先 DeePMD（社区大）
\`\`\`

## 描述符（Descriptor）对比

描述符将 3N 维原子坐标映射为旋转平移不变的向量：

| 描述符 | 优点 | 缺点 | 使用者 |
|--------|------|------|--------|
| **se_e2_a** (DeepMD) | 生产验证最充分 | 对数据量要求较高 | DP-GEN / 大部分 DP 论文 |
| **SOAP** (GAP) | 理论上最完备 | 计算贵 | GAP |
| **ACSF/Behler** | 经典，可控 | 需要人工调节参数 | NNP, RuNNer |
| **ACE 基函数** | 线性回归可求解 | 基组截断 | ACE |
| **等变消息传递** | 自动学特征 | 训练贵，黑箱 | NequIP / MACE / Allegro |

## 实际速度参考

（单 GPU 推理，1000 atoms）

| ML 势 | 速度 (step/s) | 相对 DFT 加速 |
|--------|-------------|-------------|
| DeePMD (se_e2_a) | ~10⁴ | ~10⁴× |
| ACE (PACE) | ~10⁵ | ~10⁵× |
| MTP | ~10⁴ | ~10⁴× |
| GAP (SOAP) | ~10² | ~10²× |
| NequIP (Allegro) | ~10³ | ~10³× |

## 通用 MLIP 框架

2024-2025 出现了多个"万能 MLIP"，类似 LLM 的 foundation model：

| 模型 | 覆盖元素 | 架构 |
|------|---------|------|
| **MACE-MP-0** | 89 元素（全周期表） | MACE (等变 MPNN) |
| **CHGNet** | 89 元素 | GNN + 磁矩 |
| **SevenNet** | 89 元素 | Equiformer |
| **MatterSim** | 全周期表 | GNN + 自监督 |
| **ORB** | 全周期表 | Equiformer v2 |

## 与 DP-GEN 的衔接

DP-GEN 天然产出 DeePMD 势。如果要切换：

\`\`\`bash
# DP-GEN 产出的数据 (set.xxx/) 可以直接用于：
# - 训练 DeePMD（已有链路）
# - 训练 ACE / MTP（需要格式转换）
# - 精调 MACE / CHGNet（用 DP-GEN 标注数据做 fine-tune）

# 格式转换工具
dpdata set.000/xyz  → ASE Atoms → ACE/MTP 训练格式
\`\`\`

> 目前最稳妥的路径还是 DP-GEN + DeePMD。通用 MLIP（MACE/CHGNet）适合快速筛选或初始猜测，正式发表论文前可以用 DP-GEN 精细标注。
`,
    tags: ["ML势函数", "DeePMD", "ACE", "MTP", "GAP", "NNP", "MACE", "CHGNet"],
    sourceFiles: ["ml-potentials-overview.md"],
  },
  {
    slug: "ase-practical-workflow",
    title: "ASE 实战：结构操作与高通量计算",
    category: "atomistic-sim",
    summary: "ASE 构建结构、读写格式文件、设置 calculator、跑弛豫、做高通量筛选的全流程 Python 代码",
    content: `# ASE 实战：结构操作与高通量计算

## ASE 是什么

Atomic Simulation Environment（ASE）是 Python 写的原子模拟工具箱。核心价值：

- **操作结构**（建超胞、切表面、加缺陷、读写文件）
- **对接各种 calculator**（VASP、QE、GPAW、EMT、LAMMPS…）
- **构建高通量工作流**（批处理几百个结构）

## 基本结构操作

\`\`\`python
from ase import Atoms
from ase.build import bulk, fcc111, surface, make_supercell
from ase.io import read, write
import numpy as np

# 1. 创建晶体
cu = bulk('Cu', 'fcc', a=3.61)          # Cu FCC 原胞
cu_sc = cu * (3, 3, 3)                   # 3×3×3 超胞

# 2. 切表面
cu111 = fcc111('Cu', a=3.61, size=(2, 2, 4), vacuum=10.0)
# → 2×2 面内，4 层原子，10 Å 真空层

# 3. 读写文件
atoms = read('POSCAR')                    # 从 VASP POSCAR 读
write('structure.cif', atoms)             # 导出 CIF
write('structure.xyz', atoms)             # 导出 XYZ
\`\`\`

## 搭建复杂结构

\`\`\`python
from ase.build import molecule, sort, add_adsorbate
from ase.build import graphene_nanoribbon, nanotube

# 分子
h2o = molecule('H2O')

# 在表面上吸附
slab = fcc111('Pt', a=3.92, size=(3, 3, 4), vacuum=10)
add_adsorbate(slab, h2o, height=2.5, position='ontop')

# 掺杂：替换第 5 个原子为 Ni
slab[4].symbol = 'Ni'

# 空位：删除第 10 个原子
del slab[10]

# 随机置换合金
from ase.build import bulk
cu_supercell = bulk('Cu', 'fcc', a=3.61) * (4, 4, 4)
for atom in cu_supercell:
    if np.random.random() < 0.1:
        atom.symbol = 'Ni'              # Cu90Ni10 随机合金
\`\`\`

## 对接 Calculator

\`\`\`python
# --- EMT (测试用，超快) ---
from ase.calculators.emt import EMT
atoms.calc = EMT()
e = atoms.get_potential_energy()     # 0.01 秒

# --- VASP ---
from ase.calculators.vasp import Vasp
calc = Vasp(
    xc='PBE',
    encut=500,
    kpts=(4, 4, 1),
    ismear=0,
    sigma=0.05,
    ibrion=-1,
    nsw=0,
    lwave=False,
    lcharg=False,
    directory='vasp_calc',           # 工作目录（互不污染）
)
atoms.calc = calc
atoms.get_potential_energy()         # 几分钟到几小时

# --- GPAW (免费 DFT，GPU 友好) ---
from gpaw import GPAW
calc = GPAW(xc='PBE', mode='pw', kpts=(4, 4, 1))
\`\`\`

## 弛豫优化

\`\`\`python
from ase.optimize import BFGS, BFGSLineSearch
from ase.constraints import FixAtoms

# 固定底部两层原子
mask = [atom.tag > 2 for atom in slab]  # tag > 2 = 非底层的原子
slab.set_constraint(FixAtoms(mask=mask))

# BFGS 弛豫
slab.calc = Vasp(xc='PBE', encut=500, kpts=(4,4,1),
                 ibrion=-1, nsw=0,
                 directory='relax')
opt = BFGS(slab, trajectory='relax.traj')
opt.run(fmax=0.02)  # 力收敛到 0.02 eV/Å
\`\`\`

## 高通量工作流

\`\`\`python
from ase.db import connect
from ase.optimize import BFGS

db = connect('high_throughput.db')

# 枚举 FCC 合金不同成分的晶格常数
for elem in ['Cu', 'Ag', 'Au', 'Ni', 'Pd', 'Pt']:
    for a in np.linspace(3.4, 4.2, 9):
        atoms = bulk(elem, 'fcc', a=a)
        atoms.calc = EMT()   # 高通量筛选先用 EMT 快速扫
        e = atoms.get_potential_energy()

        db.write(atoms, element=elem, lattice_constant=a, energy=e)

# 查询数据库
for row in db.select(element='Cu', sort='energy'):
    print(f"a={row.lattice_constant:.3f}, E={row.energy:.3f}")
\`\`\`

## 集成 Phonopy 算声子

\`\`\`python
from phonopy import Phonopy
from phonopy.structure.atoms import PhonopyAtoms

# ASE → Phonopy
phonopy_atoms = PhonopyAtoms(
    symbols=atoms.get_chemical_symbols(),
    scaled_positions=atoms.get_scaled_positions(),
    cell=atoms.cell,
)
phonon = Phonopy(phonopy_atoms, supercell_matrix=[[2,0,0],[0,2,0],[0,0,2]])
phonon.generate_displacements(distance=0.01)

# 对每个位移结构算力 → FORCE_CONSTANTS → 声子谱
\`\`\`

## 常见坑

| 问题 | 解决 |
|------|------|
| 不同 calculator 的 directory 会互相覆盖 | 每次设不同的 directory |
| EMT 不能用于发表（太粗糙） | 仅用于工作流测试和调试 |
| ASE VASP calculator 的 kpts 需手动设 | 不会自动生成，务必检查 |
| read('POSCAR') 不保留原子速度 | 如需速度，用 extxyz 格式 |
`,
    tags: ["ASE", "结构操作", "calculator", "高通量", "弛豫", "Phonopy"],
    sourceFiles: ["ase-practical-workflow.md"],
  },
  {
    slug: "phonopy-phono3py-workflow",
    title: "晶格动力学工具：Phonopy + phono3py 实战",
    category: "atomistic-sim",
    summary: "从二阶力常数到声子谱/态密度，三阶力常数到声子寿命和晶格热导率，完整计算管线",
    content: `# 晶格动力学工具：Phonopy + phono3py 实战

## 工具分工

| 工具 | 算什么 | 输入 | 输出 |
|------|--------|------|------|
| **Phonopy** | 简谐声子（二阶力常数 Φ₂） | 位移结构的力 | 声子色散、DOS、热力学 |
| **phono3py** | 非简谐声子（三阶力常数 Φ₃） | 位移对的力 | 声子寿命、晶格热导率 κ_L |
| **ALAMODE** | 高阶非简谐 | 结构+力 | LO-TO 劈裂、温度依赖声子谱 |

## Phonopy 快速回顾（关键参数）

\`\`\`bash
# 1. 生成超胞和位移
phonopy -d --dim="3 3 3" -c POSCAR-unitcell

# 2. 对每个 disp-*/ 跑 VASP 静态计算
# INCAR: IBRION=-1, NSW=0, PREC=Accurate, ADDGRID=.TRUE.

# 3. 收集力
phonopy -f disp-*/vasprun.xml

# 4. 声子色散 + DOS
phonopy -p band.conf -c POSCAR-unitcell
phonopy -p dos.conf -c POSCAR-unitcell

# 5. 热力学
phonopy -t -p mesh.conf -c POSCAR-unitcell
# → thermal_properties.yaml: T, F, S, Cv
\`\`\`

## phono3py 完整工作流

phono3py 需要算**三阶力常数**（Φ₃），即两个原子同时产生位移时的力。计算量是 Phonopy 的 O(N_atom × n_displacements) 倍。

\`\`\`bash
# 1. 生成超胞和位移对
phono3py -d --dim="2 2 2" --pa="auto" -c POSCAR-unitcell
# --pa="auto" 启用平移不变性约束（大幅减少位移对数量）

# 2. 对所有 disp-*/ 目录跑 VASP 静态
# 三阶计算数量远多于二阶！（可缓存/并行化）

# 3. 收集力
phono3py --cf3 disp-*/vasprun.xml

# 4. 计算晶格热导率
phono3py --mesh="11 11 11" --fc3 --fc2 --br
# --br: Boltzmann 输运方程 (RTA 近似)
# 输出 kappa-mxxx.txt: T(K), kappa_xx, kappa_yy, kappa_zz (W/m-K)
\`\`\`

## 晶格热导率公式（RTA）

\`\`\`text
κ_L^{αβ} = (1 / N_q V) Σ_{q,ν} C_{qν} v_{qν}^α v_{qν}^β τ_{qν}
\`\`\`

物理理解：
- **C_qν**：每个声子模的热容
- **v_qν**：声子群速度（从色散曲线的斜率）
- **τ_qν**：声子寿命（来自三阶非简谐散射）
- 求和遍及所有 q 点和声子支

## 声子寿命分析

\`\`\`python
import numpy as np
import matplotlib.pyplot as plt

# phono3py 输出 linewidth → 声子寿命 τ = 1/(2×linewidth)
data = np.loadtxt('linewidth.dat', skiprows=1)
freq = data[:, 0]       # THz
linewidth = data[:, 1]  # THz
tau = 1.0 / (2.0 * np.pi * linewidth * 1e12)  # seconds

plt.scatter(freq, tau*1e12, s=1)
plt.xscale('log'); plt.yscale('log')
plt.xlabel('Frequency (THz)')
plt.ylabel('Phonon lifetime (ps)')
plt.title('τ ∝ ω^(-2) 低频长寿命，高频短寿命')
\`\`\`

## 收敛测试清单

| 参数 | 测试范围 | 标准 |
|------|---------|------|
| 超胞尺寸 | 2×2×2 → 4×4×4 | 声子频率变化 < 1 cm⁻¹ |
| q 点网格 (DOS) | 11³ → 31³ | Cv 变化 < 1% |
| q 点网格 (κ_L) | 11³ → 25³ | κ_L 变化 < 5% |
| 截断半径 (三阶) | 3rd NN → 6th NN | κ_L 变化 < 5% |

## 实战加速策略

1. **对称性减少位移数**：\`--pa="auto"\` 利用空间群减少位移对
2. **超胞不要太大**：2×2×2 对简谐够用，3×3×3 对非简谐通常是实践上限
3. **先跑 Phonopy 再跑 phono3py**：用 Phonopy 确认结构稳定（无虚频）再做非简谐
4. **力收敛要更严格**：三阶力常数对力误差更敏感（推荐 EDIFF=1E-8）
`,
    tags: ["Phonopy", "phono3py", "晶格动力学", "声子寿命", "热导率", "RTA"],
    sourceFiles: ["phonopy-phono3py-workflow.md"],
  },
];
