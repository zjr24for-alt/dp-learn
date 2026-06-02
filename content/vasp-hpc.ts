import type { Article } from "@/lib/types";

export const vaspHpcArticles: Article[] = [
  {
    slug: "vasp-pbs-templates",
    title: "VASP PBS 任务模板（独立任务 + 批量FP）",
    category: "vasp-hpc",
    summary: "两个万能 PBS 模板：独立单任务和 DP-GEN 批量 FP，含所有占位符替换清单",
    content: `# VASP PBS 任务模板

## 模板 1：独立简单任务

适合单个结构优化/单点能计算：

\`\`\`bash
#!/bin/bash
#PBS -N JOB_NAME
#PBS -q QUEUE_NAME
#PBS -l nodes=1:ppn=NCORES
#PBS -j oe
#PBS -V
#PBS -S /bin/bash

# 环境配置
source INTEL_ENV_SCRIPT_PATH
cd "$PBS_O_WORKDIR" || exit 1
export OMP_NUM_THREADS=1
NP=$(wc -l < "$PBS_NODEFILE")
VASP=VASP_EXEC_PATH

# 运行 VASP
echo "Start at $(date)" > run.log
mpirun -np "$NP" "$VASP" > vasp.out 2>&1
rc=$?

# 收敛判断
if [ $rc -eq 0 ] && grep -q "reached required accuracy" OUTCAR 2>/dev/null; then
    echo "Job success" >> run.log
else
    echo "Job failed: rc=$rc" >> run.log
    exit 1
fi

echo "End at $(date)" >> run.log
\`\`\`

## 模板 2：DP-GEN 批量 FP

\`\`\`bash
#!/bin/bash
#PBS -N JOB_NAME
#PBS -q QUEUE_NAME
#PBS -l nodes=1:ppn=NCORES
#PBS -j oe
#PBS -V
#PBS -S /bin/bash

source INTEL_ENV_SCRIPT_PATH
cd "$PBS_O_WORKDIR" || exit 1
export OMP_NUM_THREADS=1
NP=$(wc -l < "$PBS_NODEFILE")
VASP=VASP_EXEC_PATH

SUCCESS_LOG="success.log"
FAILED_LOG="failed.log"
: > "$SUCCESS_LOG"
: > "$FAILED_LOG"

shopt -s nullglob

for d in task.*/; do
    echo "Running $d at $(date)"
    cd "$d" || { echo "CD FAILED: $d" >> "../$FAILED_LOG"; continue; }

    # 前置检查
    if [ ! -f POSCAR ] || [ ! -f INCAR ] || [ ! -f POTCAR ] || [ ! -f KPOINTS ]; then
        echo "MISSING FILES: $d" >> "../$FAILED_LOG"
        cd ..
        continue
    fi

    mpirun -np "$NP" "$VASP" > vasp.out 2>&1
    rc=$?

    if [ $rc -ne 0 ]; then
        echo "FAILED (RUN ERR $rc): $d" >> "../$FAILED_LOG"
    elif grep -q "reached required accuracy" OUTCAR 2>/dev/null; then
        echo "OK: $d" >> "../$SUCCESS_LOG"
    else
        echo "FAILED (NOT CONVERGED): $d" >> "../$FAILED_LOG"
    fi

    cd ..
done

echo "All tasks finished at $(date)" >> "$SUCCESS_LOG"
\`\`\`

## 占位符替换清单

| 占位符 | 实际值（示例） |
|--------|---------------|
| JOB_NAME | TiC_fp / dpgen_fp |
| QUEUE_NAME | batch |
| NCORES | 52 |
| INTEL_ENV_SCRIPT_PATH | /public/software/intel2020u2/intel2020u2_env.sh |
| VASP_EXEC_PATH | /public/software/vasp.5.4.4/bin/vasp_std |

## 提交前必做检查

\`\`\`bash
dos2unix job.pbs precheck_fp_kspacing.sh
chmod +x precheck_fp_kspacing.sh
./precheck_fp_kspacing.sh || exit 1
qsub job.pbs
\`\`\`
`,
    tags: ["VASP", "PBS", "超算", "job脚本", "批量计算"],
    sourceFiles: ["pbs脚本示例.md", "job.pbs", "手动fp.txt"],
  },
  {
    slug: "hpc-queue-limits",
    title: "超算队列资源限制",
    category: "vasp-hpc",
    summary: "batch 队列的最低进程数、最大作业数等限制说明",
    content: `# 超算队列资源限制

## batch 队列限制

| 限制项 | 值 |
|--------|-----|
| resources_min.procct | **40** |
| resources_default.nodes | 1 |
| max_user_run | 3 |

## 含义

- 作业总进程数不能低于 40
- 请勿使用低于 40 的配置（如 24、20）
- 最多同时运行 3 个作业

## 正确配置

\`\`\`bash
#PBS -l nodes=1:ppn=40
mpirun -np 40
\`\`\`

## 连接信息

| 项目 | 值 |
|------|-----|
| 主机 | 10.157.197.40 |
| 端口 | 22 |
| 用户名 | student2025 |
| 调度系统 | PBS / Torque 6 |

## 查看队列状态的常用命令

\`\`\`bash
qstat -a           # 查看所有作业
qstat -u student2025  # 只看自己的作业
qdel <job_id>      # 删除作业
pbsnodes -a        # 查看节点状态
\`\`\`
`,
    tags: ["超算", "PBS", "队列", "资源限制"],
    sourceFiles: ["服务器队列限制.txt"],
  },
  {
    slug: "vasp-library-debug",
    title: "VASP 库依赖排查（conda 环境污染）",
    category: "vasp-hpc",
    summary: "conda 环境动态库污染导致 VASP SIGSEGV 的诊断与修复全流程",
    content: `# VASP 库依赖排查

## 典型症状

- VASP 瞬间崩溃（SIGSEGV），没有任何正常输出
- 单核运行也崩溃
- \`ldd\` 显示库路径混杂了 conda 和系统路径

## 诊断步骤

### 1. 查看依赖库来源

\`\`\`bash
ldd /home/kobe/vasp.5.4.4/bin/vasp_std
\`\`\`

重点检查这些库的来源：
- libmpi, libopen-rte, libopen-pal
- libfftw3
- libmkl_*
- libscalapack*
- libgfortran
- libiomp5
- libstdc++

### 2. 检查环境变量

\`\`\`bash
echo $LD_LIBRARY_PATH
echo $PATH
\`\`\`

### 3. 干净环境测试

\`\`\`bash
conda deactivate
conda deactivate  # 确保完全退出
unset LD_LIBRARY_PATH
hash -r

# 单核测试
cd task.000.000000
/home/kobe/vasp.5.4.4/bin/vasp_std > vasp.clean.log 2>&1
tail -100 vasp.clean.log
\`\`\`

## 判断标准

健康的 ldd 输出：所有库来自同一套环境（系统库或同一 conda 环境），不混杂。

**病态特征**（你遇到过的情况）：
- MPI 来自系统：\`/usr/lib/x86_64-linux-gnu/libmpi.so.40\`
- 但 LAPACK 来自 conda：\`/home/kobe/miniconda3/envs/deepmd2/lib/liblapack.so.3\`
- FFTW 也来自 conda：\`/home/kobe/miniconda3/envs/deepmd2/lib/libfftw3.so.3\`

## 修复方式

**最优先方案**：确保 vasp_std 运行时只吃一套一致的库。
- 在 machine.json 的提交脚本环境里，先清理 LD_LIBRARY_PATH，再启动 VASP
- dpgen 可以在 conda 里，VASP 不能继承那套脏动态库环境

**如果不能**：重新编译 VASP，明确绑定你要用的那套 MPI/BLAS/FFTW/Fortran runtime。
`,
    tags: ["VASP", "ldd", "动态库", "conda", "调试", "SIGSEGV"],
    sourceFiles: ["ldd问题.yaml"],
  },
  {
    slug: "precheck-fp-script",
    title: "FP 任务提交前检查脚本",
    category: "vasp-hpc",
    summary: "自动检查所有 task.* 目录的文件完整性（POSCAR/INCAR/POTCAR/KSPACING），避免跑一半才发现缺失",
    content: `# FP 任务提交前检查脚本

\`\`\`bash
#!/bin/bash
set -u
bad=0
shopt -s nullglob

for d in task.*/; do
    miss=()
    [ -s "$d/POSCAR" ] || miss+=("POSCAR")
    [ -s "$d/INCAR"  ] || miss+=("INCAR")
    [ -s "$d/POTCAR" ] || miss+=("POTCAR")

    if ! grep -Eiq '^[[:space:]]*KSPACING[[:space:]]*=' "$d/INCAR" 2>/dev/null; then
        miss+=("KSPACING in INCAR")
    fi

    if [ \${#miss[@]} -eq 0 ]; then
        echo "OK   : \${d%/}"
    else
        echo "MISS : \${d%/} -> \${miss[*]}"
        bad=$((bad+1))
    fi
done

echo "BAD=$bad"
[ "$bad" -eq 0 ]
\`\`\`

## 使用方式

\`\`\`bash
dos2unix job.pbs precheck_fp_kspacing.sh
chmod +x precheck_fp_kspacing.sh
./precheck_fp_kspacing.sh || exit 1  # 检查不通过就不提交
qsub job.pbs
\`\`\`

## 检查项目

| 检查项 | 条件 |
|--------|------|
| POSCAR 存在且非空 | \`[ -s file ]\` |
| INCAR 存在且非空 | \`[ -s file ]\` |
| POTCAR 存在且非空 | \`[ -s file ]\` |
| INCAR 含 KSPACING | \`grep KSPACING\` |

> 这个检查在提交前拦截问题，比作业跑一半才发现省时得多。
`,
    tags: ["VASP", "FP", "检查", "PBS", "提交前"],
    sourceFiles: ["手动fp.txt"],
  },
];
