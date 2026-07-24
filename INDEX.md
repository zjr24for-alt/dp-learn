# DP Learn — 项目索引

> Deep Potential / DP-GEN / DeePMD / VASP / LAMMPS 学习笔记

## 📁 项目结构

```
dp-learn/
├── app/                  # Next.js 页面路由
│   ├── page.tsx          # 首页
│   ├── learn/            # 知识库
│   │   ├── page.tsx      # 知识库列表
│   │   └── [slug]/       # 文章详情
│   ├── cheatsheet/       # 速查表
│   ├── papers/           # 论文检索
│   ├── qa/               # 智能问答
│   ├── progress/         # 学习进度
│   ├── contribute/       # 写笔记
│   ├── config-builder/   # DP-GEN 配置构建器
│   ├── search-index/     # 搜索索引 JSON
│   ├── sitemap.ts        # 站点地图
│   └── robots.ts         # 爬虫规则
├── content/              # 知识库内容源
│   ├── index.ts          # 内容聚合 & 分类函数
│   ├── dpgen-workflow.ts # 🔄 DP-GEN 工作流
│   ├── dpgen-handson.ts  # 🔄 DP-GEN 实战指南
│   ├── deepmd-training.ts# 🧠 DeePMD 训练
│   ├── deepmd-quickstart.ts # 🧠 DeePMD 快速上手
│   ├── deepmd-tuning.ts  # 🧠 DeePMD 调优
│   ├── vasp-hpc.ts       # 💻 VASP / 超算
│   ├── env-config.ts     # ⚙️ 环境配置
│   ├── linux-tips.ts     # 🐧 Linux 速查
│   ├── methodology.ts    # 💡 学习方法论
│   ├── comp-materials.ts # 🔬 计算材料学
│   ├── atomistic-sim.ts  # 🧪 原子模拟
│   ├── ovito-tips.ts     # 👁️ OVITO 可视化
│   ├── lammps-deepmd.ts  # 🧠 LAMMPS + DeePMD
│   ├── dpdata-guide.ts   # 🧠 dpdata 数据转换
│   ├── machine-config.ts # 🔄 机器配置
│   ├── cheatsheet.ts     # 速查表条目
│   └── official-docs/    # 官方文档摘要
│       ├── index.ts
│       ├── deepmd.ts
│       ├── vasp.ts
│       ├── lammps.ts
│       └── dpdata.ts
├── components/           # React 组件
├── lib/                  # 工具库 & 类型
└── public/               # 静态资源
```

---

## 📚 知识库内容（45 篇）

### 🔄 DP-GEN 工作流（7 篇）

| # | 标题 | 摘要 |
|---|------|------|
| 1 | [DP-GEN 完整工作流与目录模板](content/dpgen-workflow.ts) | 从初始 DFT 数据到最终势函数的完整 MLP 主动学习闭环，含标准目录模板 |
| 2 | [DP-GEN 常用检查指令](content/dpgen-workflow.ts) | dpgen 运行中查看日志、训练进度、VASP状态、标注成功率的常用命令集合 |
| 3 | [DP-GEN 自动监控脚本](content/dpgen-workflow.ts) | 一个 bash 脚本实现 dpgen 进程存活检测、日志报错扫描、最新进度显示 |
| 4 | [KPOINTS Float Bug 修复](content/dpgen-workflow.ts) | DP-GEN v0.13.2 自动生成 KPOINTS 时浮点数 bug 导致 VASP 拒绝运行 |
| 5 | [如何安全暂停/终止 dpgen](content/dpgen-workflow.ts) | 一键杀掉所有 dpgen 相关进程，含事后检查方法 |
| 6 | [dpgen 启动脚本（干净环境）](content/dpgen-workflow.ts) | 避免 conda 环境污染导致 VASP 崩溃的启动方式 |
| 7 | [DP-GEN 实战指南](content/dpgen-handson.ts) | DP-GEN 主动学习的核心概念、参数设置策略、模型偏差解读与收敛判断 |

### 🧠 DeePMD 训练（10 篇）

| # | 标题 | 摘要 |
|---|------|------|
| 1 | [DeePMD 训练参数详解](content/deepmd-training.ts) | TiC MLP 项目的完整训练参数配置（descriptor、fitting_net、学习率、batch_size 等） |
| 2 | [LAMMPS + DeePMD 集成](content/lammps-deepmd.ts) | 在 LAMMPS 中使用 DP 势函数的完整配置、常见报错排查和性能优化技巧 |
| 3 | [dpdata 全能数据转换](content/dpdata-guide.ts) | dpdata 支持的输入/输出格式、LabeledSystem 用法、数据合并与切分 |
| 4 | [DeePMD 快速上手](content/deepmd-quickstart.ts) | 训练一个 DP 势函数的完整流程：数据准备 → 训练 → 冻结 → 测试 → LAMMPS |
| 5 | [网络大小调优](content/deepmd-tuning.ts) | fitting_net 与 embedding_net 的精度-速度权衡，基于官方 benchmark 数据 |
| 6 | [DeePMD 训练过程与调优指南](content/deepmd-training.ts) | 从 input.json 结构到学习率衰减、训练稳定性、loss 解读 |
| 7 | [lcurve.out 分析指南](content/deepmd-tuning.ts) | 训练过程中 lcurve.out 各列含义与判断依据 |
| 8 | [DP-GEN 常见错误与排查](content/deepmd-tuning.ts) | dpgen 运行中各阶段常见错误及其解决方法 |
| 9 | [dpdata 与 DP-GEN 集成](content/dpdata-guide.ts) | dpdata 在 DP-GEN 工作流中的具体应用场景 |
| 10 | [machine.json 配置指南](content/machine-config.ts) | machine.json 各字段详解：dispatcher_type、batch_type、context_type |

### 💻 VASP / 超算（4 篇）

| # | 标题 | 摘要 |
|---|------|------|
| 1 | [VASP PBS 任务模板](content/vasp-hpc.ts) | 两个万能 PBS 模板：独立单任务和 DP-GEN 批量 FP |
| 2 | [VASP 常见报错与处理](content/vasp-hpc.ts) | VASP 运行中常见错误（EDDDAV、BRIONS、ZPOTRF...）的识别与应对 |
| 3 | [VASP 收敛性与参数调优](content/vasp-hpc.ts) | ENCUT、KSPACING、EDIFF、SIGMA 等关键参数的收敛测试与选择策略 |
| 4 | [SLURM 作业模板](content/vasp-hpc.ts) | 适用于超算的 SLURM 作业脚本模板 |

### 🔬 计算材料学（4 篇）

| # | 标题 | 摘要 |
|---|------|------|
| 1 | [DFT 与材料计算基础](content/comp-materials.ts) | Kohn-Sham 方程、交换关联泛函、截断能收敛与 k 点采样 |
| 2 | [能带结构与态密度分析](content/comp-materials.ts) | VASP 能带计算和 DOS/PDOS 分析的完整流程 |
| 3 | [弹性常数计算](content/comp-materials.ts) | 基于应力-应变法的弹性常数计算与力学稳定性判断 |
| 4 | [表面能与表面重构](content/comp-materials.ts) | 表面能计算与 slab 模型收敛性测试 |

### 🧪 原子模拟（6 篇）

| # | 标题 | 摘要 |
|---|------|------|
| 1 | [分子动力学基础与实战](content/atomistic-sim.ts) | Verlet 积分、系综选择、thermostat/barostat 原理、timestep 选择 |
| 2 | [NVT / NPT 系综详解](content/atomistic-sim.ts) | 不同系综的适用场景、耦合参数设置与平衡判断 |
| 3 | [LAMMPS 输入文件结构](content/atomistic-sim.ts) | LAMMPS input 文件的结构化解读 |
| 4 | [势函数简介与选择](content/atomistic-sim.ts) | EAM、ReaxFF、AI-ML 势（DP）的适用范围与选择策略 |
| 5 | [LAMMPS 高级分析](content/atomistic-sim.ts) | RDF、MSD、扩散系数、应力计算 |
| 6 | [自由能计算方法](content/atomistic-sim.ts) | 热力学积分、伞形采样、metadynamics |

### 👁️ OVITO 可视化（4 篇）

| # | 标题 | 摘要 |
|---|------|------|
| 1 | [OVITO 基础操作](content/ovito-tips.ts) | GUI 界面、Pipeline 编辑器、LAMMPS/POSCAR/XYZ 导入 |
| 2 | [OVITO 高级分析](content/ovito-tips.ts) | CNA、PTM、DXA、位错分析、晶界分割等 modifier 详解 |
| 3 | [OVITO Python 脚本](content/ovito-tips.ts) | 用 ovito Python 模块实现批处理分析 |
| 4 | [OVITO 渲染与出图](content/ovito-tips.ts) | Tachyon 光线追踪、配色方案、高清出图设置 |

### ⚙️ 环境配置（2 篇）

| # | 标题 | 摘要 |
|---|------|------|
| 1 | [环境配置总览](content/env-config.ts) | 本地 WSL2 + 超算的 Conda 环境、软件版本对照 |
| 2 | [Conda 环境管理](content/env-config.ts) | conda 基本操作、环境克隆、CUDA 版本管理 |

### 🐧 Linux 速查（2 篇）

| # | 标题 | 摘要 |
|---|------|------|
| 1 | [grep 和 find 用法速查](content/linux-tips.ts) | 文件内容搜索和文件名查找命令合集，含 ripgrep 和 pdfgrep |
| 2 | [Shell 实用技巧](content/linux-tips.ts) | 别名、重定向、作业控制、rsync 等日常提效命令 |

### 💡 学习方法论（2 篇）

| # | 标题 | 摘要 |
|---|------|------|
| 1 | [计算模拟实战学习法](content/methodology.ts) | 以「复现文献」为唯一目标、「按需学习」为核心的方法论 |
| 2 | [学习计划与进度管理](content/methodology.ts) | 系统化的学习计划制定与进度追踪方法 |

---

## 📋 速查表（cheatsheet.ts）

共 30+ 条命令速查，涵盖以下类别：

| 分类 | 条目数 | 示例 |
|------|--------|------|
| `command` | 10 | `dpgen run`, `dp train`, `qsub`, `qstat`, 日志查看 |
| `vasp` | 6 | INCAR 参数、POTCAR 选择、KPOINTS 生成 |
| `deepmd` | 6 | 训练、冻结、压缩、测试命令 |
| `lammps` | 4 | pair_style、dump、run 命令 |
| `slurm` | 4 | sbatch、squeue、scancel、sinfo |
| `pbs` | 3 | qsub、qstat、qdel |
| `linux` | 4 | rsync、tar、grep、find 用法 |

---

## 📄 官方文档摘要（official-docs/）

| 来源 | 条目数 | 覆盖内容 |
|------|--------|----------|
| DeePMD | 8 | 训练参数、模型压缩、type embedding、误差分析、异常处理 |
| VASP | 6 | INCAR 参数详解、POTCAR、KPOINTS、常见报错 |
| LAMMPS | 4 | pair_style deepmd、fix/run 控制、dump 格式、in file 结构 |
| dpdata | 3 | System/LabeledSystem、多格式读写、数据操作 |

---

## 🔗 网站路由

| 路径 | 页面 | 描述 |
|------|------|------|
| `/` | 首页 | 知识分类概览 + 搜索 + 最新条目 |
| `/learn` | 知识库 | 全部文章列表，按分类筛选 |
| `/learn/[slug]` | 文章详情 | Markdown 渲染 |
| `/cheatsheet` | 速查表 | 命令快速复制 |
| `/papers` | 论文检索 | 学术论文搜索（arXiv / OpenAlex / CrossRef） |
| `/qa` | 智能问答 | AI 问答（RAG 整合知识库） |
| `/progress` | 学习进度 | 学习里程碑追踪 |
| `/contribute` | 写笔记 | 提交新笔记 |
| `/config-builder` | 配置构建器 | DP-GEN param.json / machine.json / INCAR 编辑 |
| `/search-index` | 搜索索引 JSON | 全文搜索索引（静态 JSON） |
| `/sitemap.xml` | 站点地图 | SEO 索引 |
| `/robots.txt` | 爬虫规则 | 搜索引擎爬虫配置 |

---

## 🛠️ 技术栈

- **框架**: Next.js 16.2.6 (Turbopack)
- **语言**: TypeScript
- **样式**: Tailwind CSS 4
- **搜索**: Fuse.js 7
- **渲染**: KaTeX（数学公式）
- **部署**: Vercel
