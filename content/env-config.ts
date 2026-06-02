import type { Article } from "@/lib/types";

export const envConfigArticles: Article[] = [
  {
    slug: "env-config-overview",
    title: "环境配置总览（本地 + 超算）",
    category: "env-config",
    summary: "TiC MLP 项目的完整环境配置，本地 WSL2 Ubuntu + 超算服务器的路径、Conda 环境、软件版本对照",
    content: `# 环境配置总览

## 本地环境

| 项目 | 详情 |
|------|------|
| 系统 | Ubuntu 24.04 (WSL2) |
| GPU | NVIDIA RTX 4060 Laptop, 8GB |
| CPU | 16核 |
| 项目目录 | ~/vasp_run/TiC_MLP/ |

## 关键路径

| 软件 | 路径 |
|------|------|
| dp (训练用) | /home/kobe/miniconda3/envs/deepmd/bin/dp |
| dp (dpgen用) | /home/kobe/miniconda3/envs/deepmd2/bin/dp |
| dpgen | /home/kobe/miniconda3/envs/deepmd2/bin/dpgen |
| lmp (DeePMD版) | /home/kobe/miniconda3/envs/deepmd/bin/lmp |
| VASP (本地备用) | /home/kobe/vasp.6.5.0/bin/vasp_std |
| MPI | /usr/bin/mpirun -np 4 |

## 超算环境

| 项目 | 详情 |
|------|------|
| 主机 | 10.157.197.40:22 |
| 调度系统 | PBS (Torque 6) |
| 队列 | batch |
| 每节点核数 | 52 (nodes=1:ppn=52) |

| 软件 | 路径 |
|------|------|
| VASP | /public/software/vasp.5.4.4/bin/vasp_std |
| Intel 环境 | source /public/software/intel2020u2/intel2020u2_env.sh |
| dpgen 工作目录 | /public/home/student2025/zhuangjingrun/dpgen_work/ |

## 任务分工

| 任务 | 运行位置 | 环境 |
|------|----------|------|
| VASP DFT标注 | 超算 | vasp_std + PBS |
| dpgen run 主控 | 笔记本 | deepmd2 环境 |
| dp train 训练 | 笔记本 RTX 4060 | deepmd 环境 |
| LAMMPS explore | 笔记本 | deepmd 环境 lmp |
| 数据处理转换 | 笔记本 | deepmd2 环境 |
| 画图分析 | 笔记本 | analysis 环境 |
`,
    tags: ["环境", "配置", "路径", "超算", "WSL2"],
    sourceFiles: ["环境配置备忘录.md"],
  },
  {
    slug: "conda-env-management",
    title: "Conda 环境分工与最佳实践",
    category: "env-config",
    summary: "多个 conda 环境的职责划分，如何避免环境冲突",
    content: `# Conda 环境分工

## 环境列表

| 环境名 | 版本 | 用途 |
|--------|------|------|
| deepmd | DeePMD-kit 3.1.2 + TF | dp train 训练 + LAMMPS explore |
| deepmd2 | DeePMD-kit 2.2.9 + TF 2.9 + CUDA 11.6 | dpgen run 主控 |
| vasp | Python 3.11 | DFT后处理、结构操作 |
| analysis | Python 3.11 | 数据分析、画图、JupyterLab |

## 为什么需要多个环境？

1. **dpgen 对 DeePMD 版本敏感**：dpgen run 需要特定版本的 DeePMD-kit（2.2.9），而训练可用新版（3.1.2）
2. **VASP 是 Fortran 程序，不依赖 Python 环境**：但数据处理（dpdata 等）需要 Python
3. **训练和 dpgen 的 CUDA 版本要求可能不同**

## 最佳实践

- **激活原则**：用哪个软件就激活哪个环境，用完即退出
- **VASP 隔离**：不要在 conda 环境里跑 VASP，或至少清理 LD_LIBRARY_PATH
- **路径记忆**：每个环境的可执行文件路径不同，记清楚

\`\`\`bash
# 训练
conda activate deepmd
dp train input.json

# dpgen
conda activate deepmd2
dpgen run param.json machine.json

# 分析
conda activate analysis
jupyter lab
\`\`\`
`,
    tags: ["conda", "环境", "版本管理", "最佳实践"],
    sourceFiles: ["环境配置备忘录.md"],
  },
];
