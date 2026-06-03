import type { Article } from "@/lib/types";

/** 来源: deepmodeling/dpgen + 超算实战经验 */
export const machineConfigArticles: Article[] = [
  {
    slug: "machine-json-guide",
    title: "DP-GEN machine.json 配置指南",
    category: "dpgen-workflow",
    summary: "machine.json 各字段详解：dispatcher_type、batch_type、context_type、本地/远程任务提交配置",
    tags: ["dpgen", "machine.json", "配置", "任务提交", "HPC"],
    sourceFiles: ["deepmodeling/dpgen/doc/run/mdata.rst"],
    content: `# DP-GEN machine.json 配置指南

machine.json 控制 DP-GEN 如何将训练/探索/标注任务分发到计算资源。

## 基本结构

\`\`\`json
{
  "train": [
    {
      "machine": {
        "batch_type": "PBS",
        "context_type": "local",
        "local_root": "./",
        "remote_root": "/home/user/dpgen_work"
      },
      "resources": {
        "numb_node": 1,
        "numb_gpu": 1,
        "task_per_node": 4,
        "queue_name": "gpuq",
        "envs": {
          "OMP_NUM_THREADS": "1"
        }
      },
      "command": "dp train input.json",
      "group_size": 1
    }
  ],
  "model_devi": [...],
  "fp": [...]
}
\`\`\`

## 关键字段

### batch_type — 批处理系统
| 值 | 适用集群 | 提交命令 |
|---|---------|---------|
| "PBS" | PBS/Torque | qsub |
| "Slurm" | Slurm | sbatch |
| "LSF" | IBM LSF | bsub |
| "Shell" | 本地 | 直接执行 |

### context_type — 执行上下文
| 值 | 说明 |
|---|------|
| "local" | 任务在本地执行（单机或本节点） |
| "ssh" | 通过 SSH 提交到远程集群 |
| "docker" | Docker 容器内执行 |

### local_root / remote_root
- local_root: 本地工作目录（通常是 "./"）
- remote_root: 远程集群上的工作目录（如 "/public/home/user/dpgen_work"）
- 仅 context_type="ssh" 时需要 remote_root

### resources 资源配置
\`\`\`json
"resources": {
  "numb_node": 1,        // 节点数
  "numb_gpu": 1,         // GPU 数（训练用）
  "task_per_node": 4,    // 每节点 MPI 进程数
  "cpus_per_task": 4,    // 每进程 CPU 数
  "queue_name": "gpuq",  // 队列名
  "partition": "gpu",    // Slurm 分区
  "mem_limit": 32,       // 内存限制 (GB)
  "walltime": "24:00:00", // 最大运行时间
  "envs": {              // 环境变量
    "OMP_NUM_THREADS": "1"
  }
}
\`\`\`

### 其他关键字段
- command: 执行命令（训练="dp train input.json"，探索="lmp -in in.lammps"，标注="vasp_std"）
- group_size: 每批提交的任务数（训练通常=1，标注可以=5-10）
- clean_asap: 任务完成后立即清理远程文件（节省空间）

## 三段式配置

machine.json 需要为三个阶段分别配置：

\`\`\`json
{
  "train": [{...}],      // 训练阶段（需要 GPU）
  "model_devi": [{...}], // 探索阶段（需要 GPU + LAMMPS）
  "fp": [{...}]          // 标注阶段（需要 CPU + VASP）
}
\`\`\`

## 本地单机配置示例

\`\`\`json
{
  "train": [{
    "machine": {
      "batch_type": "Shell",
      "context_type": "local",
      "local_root": "./"
    },
    "resources": {
      "numb_node": 1,
      "numb_gpu": 1,
      "task_per_node": 4
    },
    "command": "dp --pt train input.json",
    "group_size": 1
  }],
  "model_devi": [{
    "machine": {
      "batch_type": "Shell",
      "context_type": "local",
      "local_root": "./"
    },
    "resources": {
      "numb_node": 1,
      "numb_gpu": 1,
      "task_per_node": 4
    },
    "command": "lmp -in in.lammps",
    "group_size": 1
  }],
  "fp": [{
    "machine": {
      "batch_type": "Shell",
      "context_type": "local",
      "local_root": "./"
    },
    "resources": {
      "numb_node": 1,
      "task_per_node": 4
    },
    "command": "vasp_std",
    "group_size": 5
  }]
}
\`\`\`

## SSH 远程集群配置

\`\`\`json
{
  "train": [{
    "machine": {
      "batch_type": "Slurm",
      "context_type": "ssh",
      "local_root": "./",
      "remote_root": "/public/home/user/dpgen_work",
      "remote_profile": {
        "hostname": "10.157.197.40",
        "username": "user",
        "port": 22,
        "timeout": 10
      }
    },
    "resources": {
      "numb_node": 1,
      "numb_gpu": 1,
      "task_per_node": 4,
      "partition": "gpu",
      "walltime": "24:00:00"
    },
    "command": "dp --pt train input.json",
    "group_size": 1
  }]
}
\`\`\`

## 常见问题

### 1. "command not found"
- 远程集群上未安装对应软件
- 解决：在 machine.json 的 envs 中指定 conda 环境激活命令

### 2. 任务提交失败但无报错
- 检查 remote_root 是否存在
- 检查 SSH 连接是否正常
- 检查队列名/分区名是否正确

### 3. clean_asap 导致数据丢失
- clean_asap=true 会在任务完成后删除远程文件
- 如果需要保留轨迹文件，设为 false
`,
  },
  {
    slug: "slurm-job-templates",
    title: "Slurm 作业模板：DP-GEN / VASP / LAMMPS",
    category: "vasp-hpc",
    summary: "Slurm 调度系统下的作业提交模板，含 sbatch/squeue/scancel 命令速查",
    tags: ["slurm", "HPC", "作业提交", "sbatch", "超算"],
    sourceFiles: ["slurm.schedmd.com"],
    content: `# Slurm 作业模板

## Slurm 常用命令速查

| 命令 | 作用 | PBS 等价 |
|------|------|---------|
| sbatch job.slurm | 提交作业 | qsub job.pbs |
| squeue -u $USER | 查看作业 | qstat -u $USER |
| scancel 12345 | 删除作业 | qdel 12345 |
| sinfo | 查看队列状态 | qstat -q |
| salloc -N 1 -p gpu | 交互式分配 | qsub -I |
| sacct -j 12345 | 查看作业历史 | - |

## VASP 单任务模板

\`\`\`bash
#!/bin/bash
#SBATCH -J vasp_relax
#SBATCH -p cpu
#SBATCH -N 1
#SBATCH -n 16
#SBATCH --time=24:00:00
#SBATCH --output=vasp.out
#SBATCH --error=vasp.err

# 加载环境
module purge
module load intel/2020u2
module load vasp/5.4.4

# 清理 conda 污染
unset LD_LIBRARY_PATH

# 运行
mpirun -np 16 vasp_std > vasp.out 2>&1
\`\`\`

## VASP 批量 FP 模板（DP-GEN 用）

\`\`\`bash
#!/bin/bash
#SBATCH -J dpgen_fp
#SBATCH -p cpu
#SBATCH -N 1
#SBATCH -n 16
#SBATCH --time=02:00:00

module purge
module load intel/2020u2
module load vasp/5.4.4
unset LD_LIBRARY_PATH

# 遍历 task 目录并提交
for task_dir in task.*; do
  cd "$task_dir"
  mpirun -np 16 vasp_std > vasp.out 2>&1 &
  cd ..
done
wait
\`\`\`

## LAMMPS + DeePMD 模板

\`\`\`bash
#!/bin/bash
#SBATCH -J lmp_dpmd
#SBATCH -p gpu
#SBATCH -N 1
#SBATCH -n 4
#SBATCH --gres=gpu:1
#SBATCH --time=12:00:00

source /home/user/miniconda3/etc/profile.d/conda.sh
conda activate deepmd
unset LD_LIBRARY_PATH

export OMP_NUM_THREADS=1
lmp -in in.lammps -sf gpu
\`\`\`

## DeePMD 训练模板

\`\`\`bash
#!/bin/bash
#SBATCH -J dp_train
#SBATCH -p gpu
#SBATCH -N 1
#SBATCH -n 4
#SBATCH --gres=gpu:1
#SBATCH --time=48:00:00

source /home/user/miniconda3/etc/profile.d/conda.sh
conda activate deepmd
unset LD_LIBRARY_PATH

dp --pt train input.json
\`\`\`

## DP-GEN machine.json 中的 Slurm 配置

\`\`\`json
{
  "batch_type": "Slurm",
  "context_type": "local",
  "local_root": "./",
  "resources": {
    "numb_node": 1,
    "numb_gpu": 1,
    "task_per_node": 4,
    "partition": "gpu",
    "walltime": "24:00:00"
  }
}
\`\`\`

## PBS vs Slurm 命令对照

| 操作 | PBS | Slurm |
|------|-----|-------|
| 提交 | qsub job.pbs | sbatch job.slurm |
| 删除 | qdel 12345 | scancel 12345 |
| 查看 | qstat -u $USER | squeue -u $USER |
| 交互 | qsub -I | salloc -N 1 |
| 队列 | qstat -q | sinfo |
| 资源 | #PBS -l nodes=1:ppn=16 | #SBATCH -N 1 -n 16 |
| GPU | #PBS -l gpus=1 | #SBATCH --gres=gpu:1 |
| 时间 | #PBS -l walltime=24:00:00 | #SBATCH --time=24:00:00 |
| 输出 | #PBS -o out.log | #SBATCH --output=out.log |
| 队列名 | #PBS -q gpuq | #SBATCH -p gpu |
`,
  },
];
