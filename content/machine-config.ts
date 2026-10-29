import type { Article } from "@/lib/types";

/** 来源: deepmodeling/dpgen + dpdispatcher + 超算实战经验 */
export const machineConfigArticles: Article[] = [
  {
    slug: "machine-json-guide",
    title: "DP-GEN machine.json 配置指南",
    category: "dpgen-workflow",
    summary: "machine.json 各字段详解：batch_type、context_type、resources 的正确字段名、group_size 三处含义，以及运行状态与续跑机制",
    tags: ["dpgen", "machine.json", "配置", "任务提交", "HPC", "group_size"],
    sourceFiles: ["deepmodeling/dpgen/doc/run/mdata.rst", "deepmodeling/dpdispatcher"],
    content: `# DP-GEN machine.json 配置指南

machine.json 管三件事：**在哪算、怎么并发、产物传回哪**。

它**对模型精度零影响**，但配错会**静默改变实验结论**——重复提交、内存爆炸、产物找不到、断点续跑跑错，全都出在这一层。

## 三段结构

machine.json 为三个阶段分别配置，用 key 区分：

\`\`\`json
{
  "train":      [{ "machine": {...}, "resources": {...}, "command": "..." }],
  "model_devi": [{ "machine": {...}, "resources": {...}, "command": "..." }],
  "fp":         [{ "machine": {...}, "resources": {...}, "command": "..." }]
}
\`\`\`

> 也有官方示例写成**数组格式**（\`[config1, config2, config3]\`，靠位置区分 train/model_devi/fp）。两种写法都能用，但**对象格式更不容易排错**。

## machine 段

\`\`\`json
"machine": {
  "batch_type": "shell",
  "context_type": "local",
  "local_root": "./",
  "remote_root": "/path/to/remote/workdir"
}
\`\`\`

### batch_type — 批处理系统

| 值 | 适用集群 | 提交命令 |
|---|---------|---------|
| \`"shell"\` | 本地 / 无调度器 | 直接执行 |
| \`"PBS"\` | PBS / Torque | \`qsub\` |
| \`"Slurm"\` | Slurm | \`sbatch\` |
| \`"LSF"\` | IBM LSF | \`bsub\` |

### context_type — 执行上下文

| 值 | 说明 |
|---|------|
| \`"local"\` | 任务在本机执行（单机 / WSL） |
| \`"SSHContext"\` | 通过 SSH 提交到远程集群 |
| \`"DockerContext"\` | Docker 容器内执行 |

> ⚠️ 旧文档里的 \`"ssh"\` 是历史写法，**当前 dpdispatcher 用 \`"SSHContext"\`**。写错会导致 context 初始化失败。

### local_root / remote_root

- \`local_root\`：本地工作目录，通常写 \`"./"\`
- \`remote_root\`：远程执行根目录，dpgen 把任务派发到 \`remote_root/<hash>/\`
- **只要不是纯本地执行就需要 \`remote_root\`**（不只是 SSH）

### remote_profile — 远程连接信息

\`\`\`json
"remote_profile": {
  "hostname": "cluster.example.edu",
  "port": 22,
  "username": "yourname",
  "key_filename": "~/.ssh/id_rsa"
}
\`\`\`

## resources 段（字段名最容易写错）

\`\`\`json
"resources": {
  "number_node": 1,
  "cpu_per_node": 20,
  "gpu_per_node": 0,
  "queue_name": "batch",
  "group_size": 25,
  "custom_flags": [
    "#PBS -l nodes=1:ppn=20",
    "#PBS -l walltime=48:00:00",
    "#PBS -V"
  ]
}
\`\`\`

| 字段 | 含义 |
|------|------|
| \`number_node\` | 节点数 |
| \`cpu_per_node\` | 每节点 CPU 核数（= MPI 进程数） |
| \`gpu_per_node\` | 每节点 GPU 数（训练用，CPU 任务填 0） |
| \`queue_name\` | 队列名 / Slurm 分区名 |
| \`group_size\` | **每批打包多少个任务**（见下一节，三处含义不同） |
| \`custom_flags\` | 直接追加到提交脚本头的调度器指令 |
| \`envs\` | 环境变量字典 |
| \`source_list\` | 提交前 \`source\` 的环境脚本列表 |

> 🔴 **过时字段名警告**：老教程常见的 \`numb_node\` / \`numb_gpu\` / \`task_per_node\` / \`cpus_per_task\` 是 dpdispatcher 早期版本的命名，**当前版本已改为 \`number_node\` / \`gpu_per_node\` / \`cpu_per_node\`**。用旧名会报 unknown key 或被静默忽略。

## 🔴 group_size 三处含义不同（最经典的坑）

同一个名字，三个阶段三个意思：

| 位置 | 含义 | 配错的后果 |
|------|------|-----------|
| \`train.resources.group_size\` | **训练并发** | 应 = **模型数**（4 模型串行）；设错会乱序 / OOM |
| \`model_devi.resources.group_size\` | **LAMMPS 打包粒度**（越小并发越多） | 设成 1 → 全部 LAMMPS 任务同时跑 → **内存爆炸** |
| \`fp.resources.group_size\` | **每个 job 装多少个 FP 任务** | 设太大 → 单 job 超时；设太小 → 排队任务数暴涨 |

### 两个反直觉的源码事实

1. **\`param.json\` 里的 \`model_devi_group_size\` 是死键**——dpgen 根本不读它，只读 machine.json。
   \`\`\`python
   # dpgen/remote/decide_machine.py —— convert_mdata()
   group_size = task_data["resources"].get("group_size", 1)
   mdata[task_type + "_group_size"] = group_size
   \`\`\`
2. **脚本里 \`make_submission(group_size=N)\` 的 N 会被忽略**——实际分组仍读 machine.json 的 \`resources.group_size\`。想控制每 job 帧数，改 machine.json，不是改脚本参数。

## 本地单机配置示例

\`\`\`json
{
  "train": [{
    "machine": {
      "batch_type": "shell",
      "context_type": "local",
      "local_root": "./"
    },
    "resources": {
      "number_node": 1,
      "cpu_per_node": 4,
      "gpu_per_node": 1,
      "queue_name": "local",
      "group_size": 4
    },
    "command": "dp --pt train input.json"
  }],
  "model_devi": [{
    "machine": {
      "batch_type": "shell",
      "context_type": "local",
      "local_root": "./"
    },
    "resources": {
      "number_node": 1,
      "cpu_per_node": 2,
      "gpu_per_node": 0,
      "queue_name": "local",
      "group_size": 40
    },
    "command": "lmp -in in.lammps"
  }],
  "fp": [{
    "machine": {
      "batch_type": "shell",
      "context_type": "local",
      "local_root": "./"
    },
    "resources": {
      "number_node": 1,
      "cpu_per_node": 4,
      "gpu_per_node": 0,
      "queue_name": "local",
      "group_size": 5
    },
    "command": "vasp_std"
  }]
}
\`\`\`

> 注意 \`train.group_size = 4\` —— **等于模型数**，让 4 个模型串行训练。这不是"每批 4 个任务"的意思。

## 远程 PBS 集群配置示例

\`\`\`json
{
  "fp": [{
    "machine": {
      "batch_type": "PBS",
      "context_type": "SSHContext",
      "local_root": "./",
      "remote_root": "/public/home/yourname/dpgen_work",
      "remote_profile": {
        "hostname": "cluster.example.edu",
        "port": 22,
        "username": "yourname",
        "key_filename": "~/.ssh/id_rsa",
        "execute_command": "source /etc/profile && export PATH=/opt/pbs/bin:$PATH"
      }
    },
    "resources": {
      "number_node": 1,
      "cpu_per_node": 20,
      "gpu_per_node": 0,
      "queue_name": "batch",
      "group_size": 25,
      "custom_flags": [
        "#PBS -l nodes=1:ppn=20",
        "#PBS -l walltime=48:00:00",
        "#PBS -V",
        "#PBS -S /bin/bash"
      ]
    },
    "command": "NP=$(wc -l < $PBS_NODEFILE) && mpirun -np $NP vasp_std > vasp.out"
  }]
}
\`\`\`

### 远程命令的两条禁忌

- **不要用 \`bash -l -c\`**：会重置 PBS 环境变量，job 秒挂
- **不要 \`cd $PBS_O_WORKDIR\`**：dpgen 已经 cd 到 task 目录，再 cd 会跑错地方

## 运行状态机制（排查第一现场）

配好之后，运行状态散在三个地方，**看错地方就会误判失败**：

| 路径 | 是什么 |
|------|--------|
| \`record.dpgen\` | 进度记录，每行 = \`(迭代号 阶段号)\` |
| \`dpgen_work/<hash>/\` | 执行缓存，**实时进度在这里** |
| \`iter.NNNNNN/\` | 最终产物，collect 完成后才有完整文件 |

### record.dpgen 语义

- 每行 \`(迭代号 阶段号)\`，阶段号 0–8
- **看到阶段号 N = 第 N 阶段已完成**，下一步执行 N+1
- **绝不清 \`record.dpgen\` / \`iter.*\`**（那是 checkpoint）。清理只针对 \`dpgen_work/*\` 与 \`~/.dpdispatcher/submission/\`

### 三条反直觉的判读规则

| 现象 | 正确解读 |
|------|---------|
| 训练中 \`iter.N/00.train/000/\` 里没有 \`frozen_model.pb\` | ✅ 正常，还没 collect 完，别误判训练失败 |
| \`dpgen_work/<hash>/\` 里的任务目录空了 | ✅ 可能已 collect 完成，不是失败 |
| 想看实时进度 | 去 \`dpgen_work/<hash>/\`，**不是** \`iter/\` |

### 🔴 运行中改 machine.json = 重复计算

**submission hash 依赖 \`resources\`。** 运行中修改 machine.json → \`try_recover_from_json()\` 匹配不到旧 hash → 当作全新 submission 重新提交 → **重复计算**（按卡时计费的平台上就是重复花钱）。

**规则：必须等当前批次全部完成后再改。**

### 🔴 iter.NNNNNN 必须留在 dpgen 根目录

把 \`iter.00000X/\` 移进 \`iterations/\` 子目录会断掉 \`data.iters/\` 与 \`old/model.ckpt\` 的**符号链接链** → old model 加载错误 → **训练发散（\`rmse_e\` 可达 2e15）**。

可以整理的只有 \`logs/\`、\`eval_*\`、\`melt_scan*\` 这类辅助目录。

## 常见问题

### 1. command not found
- 远程集群未安装对应软件，或 PATH 未加载
- 解决：在 \`machine.json\` 的 \`envs\` 或 \`remote_profile.execute_command\` 里补上环境加载

### 2. 任务提交失败但无报错
- 检查 \`remote_root\` 是否存在且有写权限
- 检查 SSH 连接（手动 \`ssh\` 试一次）
- 检查 \`queue_name\` / 分区名是否拼对

### 3. 训练"完成"了但模型没变
- 这是 \`copy_model\` 机制：前一轮 FP 没产出 \`data.*\`（还在排队），dpgen 会**静默跳过训练、直接复制旧模型**
- 应用：进入下一轮前先 \`ls iter.(N-1)/02.fp/data.*\` 确认数据已落盘

### 4. 内存爆炸
- \`model_devi.resources.group_size\` 设成了 1
- 解决：调到合理值（如 40），让 LAMMPS 任务分批执行

### 5. clean_asap 导致数据丢失
- \`clean_asap=true\` 会在任务完成后删除远程文件
- 需要保留轨迹文件时设为 false
`,
  },
  {
    slug: "slurm-job-templates",
    title: "Slurm 作业模板：DP-GEN / VASP / LAMMPS",
    category: "vasp-hpc",
    summary: "Slurm 调度系统下的作业提交模板，含 sbatch/squeue/scancel 命令速查与 PBS 对照",
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

module purge
module load intel/2020u2
module load vasp/5.4.4

# 清理 conda 污染
unset LD_LIBRARY_PATH

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

source ~/miniconda3/etc/profile.d/conda.sh
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

source ~/miniconda3/etc/profile.d/conda.sh
conda activate deepmd
unset LD_LIBRARY_PATH

dp --pt train input.json
\`\`\`

## DP-GEN machine.json 中的 Slurm 配置

\`\`\`json
{
  "machine": {
    "batch_type": "Slurm",
    "context_type": "local",
    "local_root": "./"
  },
  "resources": {
    "number_node": 1,
    "cpu_per_node": 4,
    "gpu_per_node": 1,
    "queue_name": "gpu",
    "group_size": 1,
    "custom_flags": ["#SBATCH --time=24:00:00"]
  }
}
\`\`\`

> 字段名用 \`number_node\` / \`cpu_per_node\` / \`gpu_per_node\`，不要用老的 \`numb_node\` / \`numb_gpu\` / \`task_per_node\`。

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
