import type { Article } from "@/lib/types";

export const ovitoTipsArticles: Article[] = [
  {
    slug: "ovito-basics",
    title: "OVITO 基础操作与数据导入",
    category: "ovito-tips",
    summary: "OVITO Pro GUI 界面、Pipeline 编辑器、LAMMPS/POSCAR/XYZ 格式导入、视图操作与基础可视化",
    content: `# OVITO 基础操作与数据导入

## OVITO 是什么

OVITO (Open Visualization Tool) 是原子模拟数据的可视化和分析工具，由德国达姆施塔特工业大学开发。

**核心功能**：
- 导入 LAMMPS dump、XYZ、POSCAR、CIF 等 20+ 种格式
- Pipeline 编辑器：可叠加多个 modifier（类似滤镜链）
- Python 脚本接口（\`ovito\` Python 模块）
- 高质量渲染（Tachyon 光线追踪）

## 安装

\`\`\`bash
# GUI 版本：从 ovito.org 下载安装程序

# Python 模块（无需 GUI，适合 HPC 批处理）
pip install ovito
conda install --strict-channel-priority -c https://conda.ovito.org -c conda-forge ovito
\`\`\`

## GUI 界面速览

\`\`\`text
┌──────────────────────────────────────────────┐
│  菜单栏 (File/Edit/View/...)                   │
├────────┬─────────────────┬───────────────────┤
│        │                 │                   │
│ Pipeline│   3D 视图       │   属性面板        │
│ 编辑器  │   (Viewport)    │   (Properties)    │
│        │                 │                   │
│ 列出所有│  鼠标操作：      │  当前选中的        │
│ modifier│  左键旋转        │  modifier 参数     │
│ 链      │  滚轮缩放        │                   │
│        │  中键平移        │                   │
└────────┴─────────────────┴───────────────────┘
\`\`\`

## 数据导入

### 支持格式（常用）

| 格式 | 扩展名 | 来源 |
|------|--------|------|
| LAMMPS dump | .dump, .lammpstrj | LAMMPS |
| XYZ | .xyz | ASE, 通用 |
| POSCAR/CONTCAR | (无扩展名) | VASP |
| CIF | .cif | 晶体数据库 |
| LAMMPS data | .data, .lmp | LAMMPS |
| NetCDF | .nc | AMBER, CHARMM |
| extXYZ | .xyz | ASE（含应力/速度等扩展信息） |

### 导入 LAMMPS dump

\`\`\`bash
# LAMMPS dump 含多帧轨迹
dump mydump all custom 1000 dump.lammpstrj id type x y z fx fy fz
\`\`\`

在 OVITO 中：
1. File → Load File → 选择 \`dump.lammpstrj\`
2. OVITO 自动检测多帧 → 底部出现时间滑块
3. Pipeline 中自动添加 \`Load file\` modifier

### 导入 VASP POSCAR

OVITO 可以直接读 VASP 格式，但有时需要手动指定格式：

\`\`\`python
# Python: 导入 POSCAR
from ovito.io import import_file
pipeline = import_file("POSCAR", input_format="vasp/poscar")
\`\`\`

### 多文件导入

如果需要把多个独立的 dump 文件拼接成一个 trajectory：

\`\`\`text
File → Load File → 选择多个文件（按 Ctrl 多选）
                → ☑ 勾选 "Load as a trajectory sequence"
\`\`\`

## Pipeline 编辑器

Pipeline 类似 Blender 的 modifier 堆栈或 Photoshop 的图层。**数据从上到下流动**：

\`\`\`text
[Load file]           ← 最上层：原始数据
    ↓
[CommonNeighborAnalysis] ← 添加结构类型属性
    ↓
[ExpressionSelection]    ← 选择特定结构类型的原子
    ↓
[DeleteSelected]         ← 删除不需要的原子
    ↓
[Render]                 ← 最下层：渲染输出
\`\`\`

**右键 modifier** → 可启用/禁用、复制、移动。

## 常用快捷键

| 操作 | 快捷键 |
|------|--------|
| 旋转视图 | 鼠标左键拖动 |
| 缩放 | 滚轮 |
| 平移 | 鼠标中键拖动 |
| 复位视图 | \`R\` |
| 播放/暂停动画 | \`Space\` |
| 导出图像 | \`Ctrl+E\` |
| 导出动画 | File → Export Rendered Movie |

## 基础可视化调整

- **原子大小**：选中 Particles 的 vis element → radius 滑块
- **颜色编码**：\`Color coding\` modifier → 按 Type / Position / 自定义 Property
- **背景色**：Viewport → Background Color
- **周期性边界显示**：Simulation cell → ☑ Show periodic images (N×N×N)
`,
    tags: ["OVITO", "可视化", "LAMMPS", "dump", "Pipeline", "数据导入"],
    sourceFiles: ["ovito-basics.md"],
  },
  {
    slug: "ovito-cna-ptm",
    title: "晶体结构识别：CNA 与 PTM 实战",
    category: "ovito-tips",
    summary: "使用 CommonNeighborAnalysis 和 PolyhedralTemplateMatching 识别 FCC/BCC/HCP 结构，统计结构占比随时间演化",
    content: `# 晶体结构识别：CNA 与 PTM 实战

## CNA vs PTM 对比

| 特性 | CNA (CommonNeighborAnalysis) | PTM (PolyhedralTemplateMatching) |
|------|---------------------------|----------------------------------|
| **原理** | 统计原子对间的共近邻拓扑 | 匹配局域原子环境到多面体模板 |
| **识别能力** | FCC, HCP, BCC, ICO (二十面体) | FCC, HCP, BCC, ICO, SC, Diamond, Graphene |
| **热振动容忍度** | 差（高温下 Other 增多） | **好**（专为高温设计） |
| **速度** | 快 | 较快 |
| **适用温度** | < 0.5 T_melt | 全温度范围 |

> **推荐**：现代分析默认用 PTM，CNA 仅在低温固态或快速筛查时用。

## PTM 使用（GUI）

\`\`\`text
1. Pipeline 中 → Add Modifier → PolyhedralTemplateMatching
2. 参数：
   - rmsd_cutoff: 默认 0.1（越大越宽松）
   - output_orientation: ☑ 输出晶体取向
   - output_interatomic_distance: ☑ 输出局域原子间距
3. 结果：每个原子获得 'Structure Type' 属性
   - 0=Other, 1=FCC, 2=HCP, 3=BCC, 4=ICO, ...
\`\`\`

## 结构上色

\`\`\`text
Add Modifier → Assign Color → 基于 Structure Type 着色
典型配色：FCC=绿, HCP=红, BCC=蓝, Other=灰
\`\`\`

## PTM 使用（Python）

\`\`\`python
from ovito.io import import_file
from ovito.modifiers import PolyhedralTemplateMatchingModifier
from ovito.vis import assign_color_to_particles
import numpy as np

pipeline = import_file("dump.lammpstrj")

# 添加 PTM
pipeline.modifiers.append(PolyhedralTemplateMatchingModifier(
    rmsd_cutoff=0.1,
    output_orientation=True,
))

# 统计每帧结构占比
for frame in range(pipeline.source.num_frames):
    data = pipeline.compute(frame)

    structure_types = data.particles['Structure Type']
    n_total = len(structure_types)
    n_fcc = np.sum(structure_types == 1)
    n_hcp = np.sum(structure_types == 2)
    n_bcc = np.sum(structure_types == 3)
    n_other = np.sum(structure_types == 0)

    print(f"Frame {frame}: FCC={n_fcc/n_total:.1%}, "
          f"HCP={n_hcp/n_total:.1%}, BCC={n_bcc/n_total:.1%}, "
          f"Other={n_other/n_total:.1%}")
\`\`\`

## CNA 使用（Python）

\`\`\`python
from ovito.modifiers import CommonNeighborAnalysisModifier

pipeline.modifiers.append(CommonNeighborAnalysisModifier(
    mode=CommonNeighborAnalysisModifier.Mode.AdaptiveCutoff,
    # Adaptive: 自动确定每个原子的截断半径
    # FixedCutoff: 手动设置 cutoff（如 3.5 Å）
    # BondBased: 基于显式键合信息
))

# 结果同样在 data.particles['Structure Type']
# CNA: 0=Other, 1=FCC, 2=HCP, 3=BCC, 4=ICO
\`\`\`

## 结构占比时间演化图

\`\`\`python
import matplotlib.pyplot as plt

fcc_fractions, hcp_fractions, bcc_fractions, other_fractions = [], [], [], []

for frame in range(pipeline.source.num_frames):
    data = pipeline.compute(frame)
    types = data.particles['Structure Type']
    n = len(types)
    fcc_fractions.append(np.sum(types == 1) / n)
    hcp_fractions.append(np.sum(types == 2) / n)
    bcc_fractions.append(np.sum(types == 3) / n)
    other_fractions.append(np.sum(types == 0) / n)

frames = range(len(fcc_fractions))
plt.figure(figsize=(10, 5))
plt.plot(frames, fcc_fractions, 'g-', label='FCC')
plt.plot(frames, hcp_fractions, 'r-', label='HCP')
plt.plot(frames, bcc_fractions, 'b-', label='BCC')
plt.plot(frames, other_fractions, 'gray', label='Other')
plt.xlabel('Frame'); plt.ylabel('Fraction')
plt.legend(); plt.grid(alpha=0.3)
plt.tight_layout()
# 应用：看变形过程中 FCC→HCP 马氏体相变、辐照导致的 amorphization 等
\`\`\`

## 实战技巧

1. **CNA 对 atom_style 要求**：需要完整的原子坐标，不支持 charge 等混合 style
2. **PTM 对截断半径敏感**：如果结构被大量标为 Other，提高 rmsd_cutoff
3. **变形后的结构**：先做 PTM（识别变形后的局域环境），CNA 可能会大量 Other
4. **界面/表面**：表面原子通常被标为 Other —— 用 SelectType 过滤后再统计
5. **与 DXA 联动**：PTM → 仅保留缺陷区原子 → DXA 位错分析（减少内存和噪声）
`,
    tags: ["OVITO", "CNA", "PTM", "结构识别", "FCC", "HCP", "BCC", "Python"],
    sourceFiles: ["ovito-cna-ptm.md"],
  },
  {
    slug: "ovito-dxa-defects",
    title: "缺陷与位错分析：DXA + Wigner-Seitz",
    category: "ovito-tips",
    summary: "DislocationAnalysis (DXA) 提取位错线/密度/Burgers 矢量，Wigner-Seitz 分析点缺陷，大体系 DXA 内存优化",
    content: `# 缺陷与位错分析：DXA + Wigner-Seitz

## DXA（Dislocation Analysis）能做什么

DXA 从原子坐标中提取位错网络：

| 输出量 | 含义 |
|--------|------|
| 位错线 | 每条线的路径和 Burgers 矢量 |
| 位错密度 ρ = L/V | 总位错线长 / 体积 (m⁻²) |
| 位错类型 | 1/2<110> 完美位错、<112> 不全位错、<100> 等 |
| 空间分布 | 每条线在 3D 空间的位置 |

## DXA 工作流（GUI + Python）

### GUI
\`\`\`text
1. 先做 PTM：Add Modifier → PolyhedralTemplateMatching
2. 删除完美晶格原子（只保留缺陷区）：
   Add Modifier → ExpressionSelection
     expression: StructureType==1 || StructureType==2
                      (选 FCC + HCP 作为"好"原子)
   Add Modifier → DeleteSelected
3. DXA 分析：
   Add Modifier → DislocationAnalysis (DXA)
   参数：circuit_max_length, trial_circuit_length
\`\`\`

### Python

\`\`\`python
from ovito.io import import_file
from ovito.modifiers import (
    PolyhedralTemplateMatchingModifier,
    ExpressionSelectionModifier,
    DeleteSelectedModifier,
    DislocationAnalysisModifier,
)
import numpy as np

pipeline = import_file("nanoindentation.dump")

# 1. PTM 结构识别
pipeline.modifiers.append(PolyhedralTemplateMatchingModifier())

# 2. 只保留缺陷区原子（非 FCC + 非 HCP）
pipeline.modifiers.append(ExpressionSelectionModifier(
    expression="StructureType==1 || StructureType==2"
))
pipeline.modifiers.append(DeleteSelectedModifier())

# 3. DXA 分析
pipeline.modifiers.append(DislocationAnalysisModifier())

# 结果
data = pipeline.compute()
total_line_length = data.attributes['DislocationAnalysis.total_line_length']
cell_volume = data.attributes['DislocationAnalysis.cell_volume']
print(f"位错密度: {total_line_length / cell_volume:.3e} Å⁻² = {total_line_length / cell_volume * 1e20:.1f} × 10¹⁴ m⁻²")

# 统计伯氏矢量分布
burgers_vectors = data.dislocations['dislocations/Burgers vector']
for bv in burgers_vectors:
    print(f"Burgers vector: ({bv[0]:.2f}, {bv[1]:.2f}, {bv[2]:.2f}), "
          f"length: {np.linalg.norm(bv):.3f} Å")
\`\`\`

## DXA 位错类型判断（FCC）

\`\`\`python
def classify_dislocation(burgers_vector, lattice_constant=3.615):
    """分类 FCC 晶体的位错类型 (a = lattice_constant)"""
    b = np.array(burgers_vector)
    b_mag = np.linalg.norm(b)
    a = lattice_constant

    # 1/2<110> 完美位错
    if abs(b_mag - a/np.sqrt(2)) < 0.1:
        return "完美 1/2<110>"
    # 1/6<112> Shockley 不全位错
    elif abs(b_mag - a/np.sqrt(6)) < 0.1:
        return "Shockley 1/6<112>"
    # 1/6<110> 压杆位错 (Stair-rod)
    elif abs(b_mag - a/np.sqrt(3)) < 0.1:
        return "Stair-rod 1/6<110>"
    # 1/3<100> Hirth 位错
    elif abs(b_mag - a/3) < 0.1:
        return "Hirth 1/3<100>"
    else:
        return f"Other (|b|={b_mag:.3f} Å)"
\`\`\`

## Wigner-Seitz 缺陷分析

用于计算辐照损伤、级联碰撞后的点缺陷：

\`\`\`python
from ovito.modifiers import WignerSeitzAnalysisModifier

# 需要参考构型（未损伤的理想结构）
pipeline = import_file("cascade.dump")
ideal_pipeline = import_file("ideal.dump")  # 无缺陷参考

pipeline.modifiers.append(WignerSeitzAnalysisModifier(
    reference_configuration=ideal_pipeline.source,
    affine_mapping=WignerSeitzAnalysisModifier.AffineMapping.ToReference,
))

data = pipeline.compute()
# data.particles['Occupancy']: 1=占用, 0=空位, >1=间隙
# data.particles['Vacancy Count']: 空位计数
# data.particles['Interstitial Count']: 间隙计数
\`\`\`

## 大体系 DXA 内存优化

DXA 在 > 10⁶ 原子时内存爆炸。策略：

\`\`\`python
from ovito.modifiers import ExpandSelectionModifier

# 1. PTM 识别
pipeline.modifiers.append(PolyhedralTemplateMatchingModifier())

# 2. 选择缺陷区种子
pipeline.modifiers.append(ExpressionSelectionModifier(
    expression="StructureType != 1 && StructureType != 2"
))

# 3. 扩展选择区域（包含缺陷附近的 N 层原子）
pipeline.modifiers.append(ExpandSelectionModifier(
    num_neighbors=10,    # 向外扩展 10 层
    mode=ExpandSelectionModifier.ExpansionMode.BondFree,
    cutoff=3.5,
))

# 4. 反选（删除远离缺陷的完美区）
pipeline.modifiers.append(ExpressionSelectionModifier(
    expression="Selection == 0"
))
pipeline.modifiers.append(DeleteSelectedModifier())

# 5. 仅在缺陷区运行 DXA（大幅减少 DXA 计算量）
pipeline.modifiers.append(DislocationAnalysisModifier())

# !注意：位错线连接可能丢失 ~10-15%，只计核心区密度可接受
\`\`\`

参考：[Memory-Optimized-DXA-OVITO](https://github.com/prash-dwivedi/Memory-Optimized-DXA-OVITO)

## DXA 常见问题

| 问题 | 原因 | 解决 |
|------|------|------|
| DXA 找不到位错 | 先导删除了太多原子 | 保留足够厚的缺陷周围区域 |
| 位错线不连续 | 原子间距 > circuit_max_length | 增大 trial_circuit_length |
| OOM (内存溢出) | 全体系 DXA | 用 ExpandSelection 只跑缺陷区 |
| 位错密度偏大 | 表面原子被识别为缺陷 | 分析前删除表面附近原子 |
| 缺陷网格干扰可视化 | DXA 输出含 surface mesh | 渲染时禁用 SurfaceMeshVis |
`,
    tags: ["OVITO", "DXA", "位错分析", "Wigner-Seitz", "缺陷", "Burgers矢量", "位错密度"],
    sourceFiles: ["ovito-dxa-defects.md"],
  },
  {
    slug: "ovito-python-scripting",
    title: "OVITO Python 脚本自动化与高质量渲染",
    category: "ovito-tips",
    summary: "ovito Python 模块批量处理、Pipeline 编程、自定义 modifier 函数、Tachyon 光线追踪渲染发表级图像",
    content: `# OVITO Python 脚本自动化与高质量渲染

## ovito Python 模块

OVITO Pro 提供了一个免费的 Python 模块（\`pip install ovito\`），可以在**无 GUI** 的环境下使用全部分析能力。

\`\`\`bash
# 运行 OVITO Python 脚本
ovitos my_script.py
# 或者直接用 Python
python my_script.py  # 需要先 pip install ovito
\`\`\`

## 基本 Python 管线

\`\`\`python
from ovito.io import import_file, export_file
from ovito.modifiers import *
from ovito.vis import *
import numpy as np

# 1. 构建 Pipeline
pipeline = import_file("dump.lammpstrj")

# 2. 叠加 modifiers（顺序 = 执行顺序）
pipeline.modifiers.append(PolyhedralTemplateMatchingModifier())
pipeline.modifiers.append(ExpressionSelectionModifier(
    expression="StructureType==1"
))
pipeline.modifiers.append(AssignColorModifier(
    color=(1.0, 0.0, 0.0)   # 红色 RGB
))

# 3. 计算一帧
data = pipeline.compute(0)  # 第 0 帧

# 4. 访问数据
print(f"原子数: {data.particles.count}")
print(f"平均位置: {data.particles.positions[:].mean(axis=0)}")
print(f"力: {data.particles.forces[:5]}")  # 前 5 个原子的力
\`\`\`

## 批量处理模板

遍历所有帧，每帧做分析，收集统计数据：

\`\`\`python
from ovito.io import import_file
from ovito.modifiers import PolyhedralTemplateMatchingModifier
import numpy as np

pipeline = import_file("production.dump")
pipeline.modifiers.append(PolyhedralTemplateMatchingModifier())

results = []
for frame in range(pipeline.source.num_frames):
    data = pipeline.compute(frame)

    types = data.particles['Structure Type']
    fcc_frac = np.sum(types == 1) / len(types)
    hcp_frac = np.sum(types == 2) / len(types)

    # 收集势能（如果 LAMMPS dump 里有）
    if 'Potential Energy' in data.particles:
        pe_mean = data.particles['Potential Energy'][:].mean()
    else:
        pe_mean = 0.0

    results.append({
        'frame': frame,
        'fcc': fcc_frac,
        'hcp': hcp_frac,
        'pe': pe_mean,
    })
    print(f"Frame {frame+1}/{pipeline.source.num_frames}: FCC={fcc_frac:.1%}")

# 保存结果
np.savetxt('analysis.csv',
    [[r['frame'], r['fcc'], r['hcp'], r['pe']] for r in results],
    header='frame,fcc,hcp,pe', delimiter=',')
\`\`\`

## 自定义 Modifier 函数

\`\`\`python
from ovito.data import DataCollection

def compute_centrosymmetry(frame: int, data: DataCollection):
    """自定义 modifier: 计算每个原子的中心对称参数"""
    import numpy as np
    from ovito.data import CutoffNeighborFinder

    finder = CutoffNeighborFinder(3.5, data)
    positions = data.particles.positions[:]
    csp = np.zeros(data.particles.count)

    for i in range(data.particles.count):
        nbr_indices = finder.find(i)
        nbr_positions = positions[nbr_indices]
        # 取最近的 12 个邻居（FCC）
        if len(nbr_indices) >= 12:
            pairs = nbr_positions[:12]
            # CSP = sum|R_i + R_{i+6}|²  (对 6 对相反邻居)
            csp[i] = np.sum((
                pairs[:6] - pairs[:6][::-1] +
                positions[i] - positions[i]
            )**2)

    data.particles_.create_property('CSP', data=csp)

# 注册自定义 modifier
pipeline.modifiers.append(compute_centrosymmetry)
\`\`\`

## Tachyon 光线追踪渲染

Tachyon 是 OVITO 内置的物理渲染器，支持 AO（环境光遮蔽）、阴影和景深。

\`\`\`python
from ovito.io import import_file
from ovito.vis import Viewport, TachyonRenderer
from ovito.vis import assign_color_to_particles

pipeline = import_file("structure.dump")

# 设置可视化参数
pipeline.compute(0)  # 先计算一帧获取粒子数据
data = pipeline.compute(0)

# 设置粒子半径
from ovito.vis import ParticlesVis
vis = pipeline.source.data.particles.vis
vis.radius = 0.7

# 创建视口
vp = Viewport(type=Viewport.Type.Perspective)
vp.camera_pos = (20, -30, 20)
vp.camera_dir = (0, 0, 0)   # 相机看向原点
vp.camera_up = (0, 0, 1)    # z 轴为上
vp.fov = 30.0               # 视场角

# 渲染
vp.render_image(
    size=(1920, 1080),
    filename="render.png",
    background=(1.0, 1.0, 1.0),
    alpha=True,
    renderer=TachyonRenderer(
        ambient_occlusion=True,
        ambient_occlusion_samples=32,
        shadows=True,
        direct_light_intensity=0.8,
        antialiasing=True,
        antialiasing_samples=12,
    ),
)
\`\`\`

## 批量渲染多帧

\`\`\`python
for frame in range(pipeline.source.num_frames):
    data = pipeline.compute(frame)
    vp.render_image(
        size=(1920, 1080),
        filename=f"render_{frame:04d}.png",
        renderer=TachyonRenderer(ambient_occlusion=True, shadows=True),
    )
    print(f"Rendered frame {frame}")
\`\`\`

## 导出不同格式

\`\`\`python
from ovito.io import export_file

# 导出当前帧
export_file(pipeline, "output.xyz", "xyz",
    frame=0, columns=["Particle Identifier", "Position.X", "Position.Y", "Position.Z", "Structure Type"])

# 导出全部帧为系列文件
export_file(pipeline, "output.*.lammpstrj", "lammps/dump",
    multiple_frames=True,
    columns=["Particle Identifier", "Particle Type", "Position.X", "Position.Y", "Position.Z"])

# 导出位错线为 CA 格式 (Crystal Analysis)
export_file(pipeline, "dislocations.ca", "ca", export_mesh=False)
\`\`\`

## GUI 生成 Python 代码

OVITO Pro GUI 可以**自动生成**操作的等效 Python 代码：

\`\`\`text
1. 在 GUI 中完成所有操作（import → modifiers → 渲染）
2. File → Generate Python Script
3. 复制代码到 .py 文件
4. 稍作修改即可用于批处理或 HPC
\`\`\`

## HPC 无头运行

\`\`\`bash
#!/bin/bash
#PBS -N ovito_analysis
#PBS -l nodes=1:ppn=4

# 在 HPC 上用 ovitos 跑批处理
ovitos --nogui analysis.py
# 或
python analysis.py   # 前提：pip install ovito
\`\`\`

> OVITO 的 Python 模块是免费的，但 Pro 版 GUI 需要 license。Python 模块已包含全部 modifiers 和 Tachyon 渲染器，对于批处理和 HPC 完全够用。
`,
    tags: ["OVITO", "Python", "批处理", "Tachyon", "渲染", "自定义modifier", "HPC"],
    sourceFiles: ["ovito-python-scripting.md"],
  },
];
