(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,94757,27255,e=>{"use strict";let t=[{slug:"dpgen-workflow-overview",title:"DP-GEN 完整工作流与目录模板",category:"dpgen-workflow",summary:"从初始 DFT 数据到最终势函数的完整 MLP 主动学习闭环，含标准目录模板",content:`# DP-GEN 完整工作流与目录模板

## 总流程

MLP 开发主线：

\`\`\`text
初始DFT数据
   ↓
训练初始模型（DeepMD）
   ↓
LAMMPS探索（DP-GEN）
   ↓
偏差筛选
   ↓
VASP重新标注
   ↓
数据回流
   ↓
下一轮训练
   ↓
最终势函数 graph.pb
\`\`\`

这就是**主动学习闭环**。一句话记忆：**结构 → 模型探索 → 偏差筛选 → DFT标注 → 数据回流 → 再训练**。

## 标准目录模板

\`\`\`text
TiC_MLP/
├── dpgen/
│   ├── param.json          # 主控参数
│   ├── machine.json        # 机器配置
│   ├── input.json          # 训练输入参数
│   ├── INCAR_fp            # VASP INCAR 模板
│   ├── POTCAR_Ti / POTCAR_C # 赝势文件
│   ├── init_data/
│   │   └── set.000/        # 初始训练数据
│   ├── iter.000000/
│   │   ├── 00.train/       # 训练：产出 graph.*.pb
│   │   ├── 01.model_devi/  # 探索：产出 model_devi.out + traj/
│   │   └── 02.fp/          # 标注：产出 OUTCAR
│   ├── iter.000001/        # 第二轮...
│   └── final_model/
│       └── graph.pb        # 最终势函数
└── scripts/
    ├── make_fp_tasks.py
    ├── collect_fp.py
    └── merge_training_data.py
\`\`\`

## 各阶段核心文件

| 阶段 | 最重要文件 | 作用 |
|------|-----------|------|
| 训练 | graph.*.pb | 4个模型的 committee |
| 探索 | model_devi.out | 偏差筛选依据 |
| 标注 | OUTCAR | 包含能量、力、应力 |
| 数据回流 | set.xxx/ | 下一轮训练输入 |

> 优先级：**OUTCAR > model_devi.out > graph.pb > set.xxx**
`,tags:["dpgen","workflow","主动学习","目录结构","MLP"],sourceFiles:["工作流程以及模版文件夹.md"]},{slug:"dpgen-check-commands",title:"DP-GEN 常用检查指令",category:"dpgen-workflow",summary:"dpgen 运行中查看日志、训练进度、VASP状态、标注成功率的常用命令集合",content:`# DP-GEN 常用检查指令

## 1. 查看最新日志（最常用）

\`\`\`bash
tail -20 ~/C_deepmd_workflow/04_dpgen/dpgen.log
\`\`\`

## 2. 查看当前轮次和任务

\`\`\`bash
cat ~/C_deepmd_workflow/04_dpgen/record.dpgen | tail -5
\`\`\`

## 3. 查看各轮 candidate 变化趋势

\`\`\`bash
grep "candidate" ~/C_deepmd_workflow/04_dpgen/dpgen.log
\`\`\`

## 4. 查看训练进度

\`\`\`bash
tail /tmp/dpgen_train/*/000/train.log 2>/dev/null | grep "batch"
\`\`\`

## 5. 查看 VASP 是否在计算

\`\`\`bash
grep "Elapsed time" ~/C_deepmd_workflow/04_dpgen/iter.000*/02.fp/task.*/OUTCAR 2>/dev/null | wc -l
\`\`\`

## 6. 查看 dpgen 进程是否还在跑

\`\`\`bash
ps aux | grep dpgen | grep -v grep
\`\`\`

## 7. 查看每轮标注成功率

\`\`\`bash
grep "failed frame|failed tasks" ~/C_deepmd_workflow/04_dpgen/dpgen.log | tail -10
\`\`\`

## 标准启动流程

\`\`\`bash
sudo hostname kobe-pc
echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf
conda activate deepmd2
cd ~/C_deepmd_workflow/04_dpgen
dpgen run param.json machine.json 2>&1 | tee -a dpgen.log
\`\`\`

## 续跑前防重复提交

\`\`\`bash
rm -rf ~/.dpdispatcher
\`\`\`
`,tags:["dpgen","日志","监控","检查","命令"],sourceFiles:["dpgen常用检查指令.txt"]},{slug:"dpgen-watch-script",title:"DP-GEN 自动监控脚本",category:"dpgen-workflow",summary:"一个 bash 脚本实现 dpgen 进程存活检测、日志报错扫描、最新进度显示，带颜色和响铃报警",content:`# DP-GEN 自动监控脚本

\`\`\`bash
#!/bin/bash
LOGFILE=/mnt/d/azuoye/vasp/TiC_MLP/dpgen/dpgen.log  # ← 改成实际路径
INTERVAL=30  # 每30秒检查一次

RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
NC='\\033[0m'

echo "=== dpgen 监控启动 $(date) ==="

while true; do
    # 1. 检查dpgen进程是否存活
    if ! pgrep -f "dpgen run" > /dev/null; then
        echo -e "\${RED}[$(date +%H:%M:%S)] ❌ dpgen进程已死！\${NC}"
        echo -e "\\a\\a\\a"
    else
        echo -e "\${GREEN}[$(date +%H:%M:%S)] ✅ dpgen运行中 (PID: $(pgrep -f 'dpgen run'))\${NC}"
    fi

    # 2. 扫描log里的报错关键词
    if [ -f "$LOGFILE" ]; then
        errors=$(tail -n 100 "$LOGFILE" | grep -iE "error|exception|killed|oom|segfault|traceback|failed" | grep -v "^#")
        if [ -n "$errors" ]; then
            echo -e "\${RED}[$(date +%H:%M:%S)] ⚠️  发现报错：\${NC}"
            echo "$errors" | tail -5
            echo -e "\\a\\a\\a"
        fi

        # 3. 显示最新进度
        progress=$(tail -n 5 "$LOGFILE" | grep -E "iter|train|model_devi|fp|step")
        if [ -n "$progress" ]; then
            echo -e "\${YELLOW}  最新进度: $(echo $progress | tail -1)\${NC}"
        fi
    else
        echo -e "\${YELLOW}[$(date +%H:%M:%S)] log文件还不存在，等待中...\${NC}"
    fi

    echo "---"
    sleep $INTERVAL
done
\`\`\`

## 使用方法

\`\`\`bash
chmod +x ~/watch_dpgen.sh
bash ~/watch_dpgen.sh
\`\`\`

## 功能说明

| 功能 | 实现方式 |
|------|---------|
| 进程存活检测 | \`pgrep -f "dpgen run"\` |
| 报错关键词扫描 | 最近100行中匹配 error/exception/killed/oom/segfault/traceback/failed |
| 进度显示 | 匹配 iter/train/model_devi/fp/step |
| 报警 | 终端响铃 \`\\a\` |
`,tags:["dpgen","监控","bash","脚本","自动化"],sourceFiles:["11.txt"]},{slug:"kpoints-float-bug-fix",title:"KPOINTS Float Bug 修复（dpgen 源码修改）",category:"dpgen-workflow",summary:"DP-GEN v0.13.2 自动生成 KPOINTS 时出现浮点数 bug 导致 VASP 拒绝运行，需修改源码修复",content:`# KPOINTS Float Bug 修复

## 问题背景

使用 DP-GEN（v0.13.2）进行 VASP FP 计算时：
- KPOINTS 被自动生成，网格写成浮点数（如 \`2.0 2.0 2.0\`）
- VASP 报错：\`Error reading KPOINTS file (line 4)\`
- 删除 \`KSPACING\` 会导致 dpgen 报错：\`RuntimeError: KSPACING must be given in INCAR\`

## 问题本质

DP-GEN 默认逻辑：
1. 强制使用 \`KSPACING\` 自动生成 KPOINTS
2. 即使提供 \`"fp_kpoints"\` 也会被覆盖
3. 自动生成存在 float bug（不符合 VASP 整数网格要求）

## 解决方案（源码修改）

### 修改文件

\`\`\`
dpgen/generator/run.py
\`\`\`

### 修改函数

\`\`\`
make_fp_vasp_kp()
\`\`\`

### 修改内容

在函数开头添加：

\`\`\`python
def make_fp_vasp_kp(iter_index, jdata):
    # 如果用户提供了 KPOINTS，则跳过自动生成
    if "fp_kpoints" in jdata and jdata["fp_kpoints"]:
        return
\`\`\`

### 可选增强（避免 KSPACING 报错）

将：
\`\`\`python
kspacing = standard_incar["KSPACING"]
\`\`\`
改为：
\`\`\`python
kspacing = standard_incar.get("KSPACING", None)
if kspacing is None:
    return
\`\`\`

## 使用规范

### param.json
\`\`\`json
"fp_kpoints": "./KPOINTS"
\`\`\`

### INCAR
\`\`\`bash
KGAMMA = .TRUE.
# 不再依赖 KSPACING
\`\`\`

### KPOINTS（分子体系推荐）
\`\`\`
Gamma
0
Gamma
1 1 1
0 0 0
\`\`\`

## 注意事项
- 修改源码后需重新生成 FP 任务
- 旧 task 目录需删除，否则仍使用错误 KPOINTS
- 每次更换 conda 环境或重装 dpgen 需重新检查此修改

## 检查脚本

\`\`\`bash
DPGEN_PATH=$(python -c "import dpgen; import os; print(os.path.dirname(dpgen.__file__))")
grep -q 'fp_kpoints' "$DPGEN_PATH/generator/run.py" && echo "✅ 补丁已应用" || echo "❌ 需要重新打补丁"
\`\`\`
`,tags:["dpgen","KPOINTS","VASP","bugfix","源码修改"],sourceFiles:["vasp源码变动.md","check_dpgen_patch.sh"]},{slug:"stop-dpgen-safely",title:"如何安全暂停/终止 dpgen",category:"dpgen-workflow",summary:"一键杀掉所有 dpgen 相关进程（训练+探索+标注），含事后检查方法",content:`# 如何安全暂停/终止 dpgen

## 一键全停

\`\`\`bash
pkill -9 -f "dpgen run"
pkill -9 -f lmp
pkill -9 -f vasp
pkill -9 -f deepmd
pkill -9 -f "dp train"
\`\`\`

这条命令覆盖：**训练 + 探索 + 标注** 全部进程。

## 停完后必须检查

\`\`\`bash
ps -ef | grep -E "dpgen|lmp|vasp|deepmd|dp train"
\`\`\`

如果输出只剩下 \`grep\` 自己，说明已经彻底停干净。

## 注意事项

1. **不要清理 iter.* 目录**（标注数据会丢失）
2. **可以清理** \`~/.dpdispatcher\`（解决重复提交问题）
3. **可以清理** \`/tmp/dpgen_*\`（释放临时空间）
4. **record.dpgen 不要随意修改**
`,tags:["dpgen","进程管理","pkill","运维"],sourceFiles:["暂停.txt"]},{slug:"dpgen-clean-startup",title:"dpgen 启动脚本（干净环境）",category:"dpgen-workflow",summary:"避免 conda 环境污染导致 VASP 崩溃的启动方式",content:`# dpgen 启动脚本（干净环境）

## 推荐启动方式

\`\`\`bash
#!/bin/bash
source /home/kobe/miniconda3/etc/profile.d/conda.sh
conda activate dpgen_test_env
unset LD_LIBRARY_PATH
export PATH=/home/kobe/miniconda3/envs/dpgen_test_env/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/home/kobe/vasp.5.4.4/bin
dpgen run param.json machine.json
\`\`\`

## 为什么需要干净环境

VASP 是静态编译的 Fortran 程序，对动态库版本非常敏感。
如果 conda 环境的 \`LD_LIBRARY_PATH\` 污染了 VASP 的库搜索路径（尤其是 LAPACK/FFTW/Fortran runtime），会导致 SIGSEGV。

## 核心原则

- dpgen 可以在 conda 里运行
- VASP 不能继承 conda 的动态库环境
- 在 machine.json 的提交脚本里也要清理 LD_LIBRARY_PATH
`,tags:["dpgen","环境变量","conda","VASP","启动"],sourceFiles:["run.sh"]},{slug:"candidate-health-check",title:"模型偏差与 candidate 健康判断",category:"dpgen-workflow",summary:"如何通过 candidate 比例和 failed 比例判断主动学习是否健康",content:`# 模型偏差与 candidate 健康判断

## candidate 比例含义

| 范围 | 状态 | 建议 |
|------|------|------|
| **< 5%** | 模型太差，探索无效 | 检查训练数据质量，可能需要更多初始数据 |
| **10~30%** | 健康状态 | 模型在学习，正常推进 |
| **> 50%** | 阈值太宽 | 可以收紧 trust_hi |
| **failed > 90%** | 模型很差或结构崩溃 | 检查初始训练、POSCAR 合理性 |
| **accurate > 80%** | 模型接近收敛 | 可以考虑停止主动学习 |

## 关键参数调节

在 \`param.json\` 的 \`model_devi\` 段：

\`\`\`json
{
  "model_devi_dt": 0.001,
  "model_devi_skip": 200,
  "model_devi_f_trust_lo": 0.05,
  "model_devi_f_trust_hi": 0.35
}
\`\`\`

- \`trust_lo\`：低于此值的帧被认为准确
- \`trust_hi\`：高于此值的帧被认为是 candidate（需要标注）
- \`trust_lo\` ~ \`trust_hi\` 之间：被认为不够好但也不值得标注

## 调参策略

1. candidate 太少 → 降低 trust_lo、trust_hi
2. candidate 太多 → 提高 trust_hi
3. failed 太多 → 检查训练收敛性，可能需要增加训练步数
`,tags:["dpgen","model_devi","candidate","信任度","调参"],sourceFiles:["dpgen常用检查指令.txt"]}],i=[{slug:"deepmd-training-params",title:"DeePMD 训练参数详解",category:"deepmd-training",summary:"TiC MLP 项目的完整训练参数配置（descriptor、fitting_net、学习率、batch_size 等）",content:`# DeePMD 训练参数详解

## 模型参数

| 参数 | 值 | 说明 |
|------|-----|------|
| numb_models | 4 | committee model 数量 |
| numb_steps | 400,000 | 总训练步数 |
| type_map | Ti, C | 元素类型 |
| mass_map | 47.867, 12.011 | 原子质量 |

## 网络结构

### Descriptor: se_e2_a
| 参数 | 值 | 说明 |
|------|-----|------|
| neuron | [25, 50, 100] | 嵌入网络每层神经元 |
| axis_neuron | 16 | 轴神经元数 |
| rcut | 6.5 \xc5 | 截断半径 |
| rcut_smth | 5.0 \xc5 | 平滑截断起点 |
| sel | [40, 40] | 每种元素的最大近邻数 |

### Fitting Net
| 参数 | 值 |
|------|-----|
| neuron | [120, 120, 120] |

## 学习率策略

| 参数 | 值 | 说明 |
|------|-----|------|
| type | exp | 指数衰减 |
| start_lr | 0.001 | 初始学习率 |
| stop_lr | 1e-8 | 终止学习率 |
| decay_steps | 50,000 | 衰减步数 |

学习率变化：\`lr = start_lr * exp(-step / decay_steps)\`

## 训练数据

- TiC 216 原子体系（108 Ti + 108 C）
- 共 3311 帧
- 300K (1645帧) + 1000K (486帧) + 3000K (1180帧)
- batch_size: auto（DeePMD 自动选择）

## Committee Model 策略

训练 4 个独立模型（不同初始化），在 model_devi 阶段计算力的标准差：
- 偏差大 → 模型不确定 → 需要 VASP 标注
- 偏差小 → 模型一致 → 该区域已学好
`,tags:["deepmd","训练","参数","descriptor","学习率"],sourceFiles:["dpgen_tic_project_summary_v2.html"]},{slug:"committee-model",title:"Committee Model 策略",category:"deepmd-training",summary:"为什么要训练 4 个模型？committee model 的原理与偏差评估",content:`# Committee Model 策略

## 为什么是 4 个模型？

DP-GEN 使用 **committee model（委员会模型）** 策略：
- 用相同数据、不同随机种子训练 4 个独立模型
- 推理时，对同一结构分别用 4 个模型计算原子力
- 计算 4 个模型的力之间的标准差 → **模型偏差（model deviation）**

## 偏差的含义

| 偏差大小 | 含义 | 行动 |
|---------|------|------|
| 小（< trust_lo） | 4 个模型一致，该区域已学好 | 无需标注 |
| 中 | 模型不完全一致 | 不标注（边界情况） |
| 大（> trust_hi） | 模型分歧大，该区域陌生 | 送去 VASP 标注 |

## 偏差计算

\`\`\`
max_devi_f = max(σ_f)  # 每个原子的力标准差的最大值
\`\`\`

这个值记录在 \`model_devi.out\` 中，每列对应一个模型的偏差。

## 实际效果

- 第一轮：模型只见过 AIMD 数据，偏差很大
- 随着标注数据回流，模型的"知识边界"逐渐扩展
- 最后几轮 candidate 比例降到很低 → 模型收敛

> 一句话：**Committee 用模型之间的分歧来"投票"选出模型最不确定的结构**
`,tags:["deepmd","committee","模型偏差","主动学习"],sourceFiles:["工作流程以及模版文件夹.md"]},{slug:"data-reflux-outcar-to-set",title:"数据回流：OUTCAR → set.xxx",category:"deepmd-training",summary:"如何将 VASP 标注产出的 OUTCAR 转换成下一轮训练可用的 set.xxx 格式",content:`# 数据回流：OUTCAR → set.xxx

## 流程

1. 收集 \`02.fp\` 下所有 task 目录的 OUTCAR
2. 用 dpdata 提取能量、力、应力
3. 转换为 DeePMD 训练格式

## 核心代码

\`\`\`python
import dpdata
import numpy as np

# 收集所有 OUTCAR
systems = []
for task_dir in sorted(Path("iter.000000/02.fp").glob("task.*")):
    outcar = task_dir / "OUTCAR"
    if outcar.exists():
        s = dpdata.LabeledSystem(str(outcar), fmt="vasp/outcar")
        systems.append(s)

# 合并并保存
merged = systems[0]
for s in systems[1:]:
    merged.append(s)

merged.to_deepmd_npy("set.001")
\`\`\`

## 输出格式

\`\`\`text
set.001/
├── box.npy      # 晶胞向量 (n_frames, 9)
├── coord.npy    # 原子坐标 (n_frames, n_atoms*3)
├── energy.npy   # 总能量 (n_frames,)
├── force.npy    # 原子力 (n_frames, n_atoms*3)
├── virial.npy   # 应力张量 (n_frames, 9)
└── type.raw     # 原子类型映射
\`\`\`

## 数据合并

第二轮训练时，训练集 = set.000（初始数据）+ set.001（新标注数据），
模型在更大的数据集上重训，偏差范围收窄。

## 注意事项

- 确保 type_map 一致（Ti→0, C→1）
- 检查 virial 是否提取成功（某些旧版 VASP OUTCAR 不含 virial）
- 如果标注失败（OUTCAR 不完整），该 task 应跳过
`,tags:["deepmd","数据回流","OUTCAR","dpdata","训练集"],sourceFiles:["工作流程以及模版文件夹.md"]}],o=[{slug:"vasp-pbs-templates",title:"VASP PBS 任务模板（独立任务 + 批量FP）",category:"vasp-hpc",summary:"两个万能 PBS 模板：独立单任务和 DP-GEN 批量 FP，含所有占位符替换清单",content:`# VASP PBS 任务模板

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
`,tags:["VASP","PBS","超算","job脚本","批量计算"],sourceFiles:["pbs脚本示例.md","job.pbs","手动fp.txt"]},{slug:"hpc-queue-limits",title:"超算队列资源限制",category:"vasp-hpc",summary:"batch 队列的最低进程数、最大作业数等限制说明",content:`# 超算队列资源限制

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
`,tags:["超算","PBS","队列","资源限制"],sourceFiles:["服务器队列限制.txt"]},{slug:"vasp-library-debug",title:"VASP 库依赖排查（conda 环境污染）",category:"vasp-hpc",summary:"conda 环境动态库污染导致 VASP SIGSEGV 的诊断与修复全流程",content:`# VASP 库依赖排查

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
`,tags:["VASP","ldd","动态库","conda","调试","SIGSEGV"],sourceFiles:["ldd问题.yaml"]},{slug:"precheck-fp-script",title:"FP 任务提交前检查脚本",category:"vasp-hpc",summary:"自动检查所有 task.* 目录的文件完整性（POSCAR/INCAR/POTCAR/KSPACING），避免跑一半才发现缺失",content:`# FP 任务提交前检查脚本

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
`,tags:["VASP","FP","检查","PBS","提交前"],sourceFiles:["手动fp.txt"]}],a=[{slug:"env-config-overview",title:"环境配置总览（本地 + 超算）",category:"env-config",summary:"TiC MLP 项目的完整环境配置，本地 WSL2 Ubuntu + 超算服务器的路径、Conda 环境、软件版本对照",content:`# 环境配置总览

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
`,tags:["环境","配置","路径","超算","WSL2"],sourceFiles:["环境配置备忘录.md"]},{slug:"conda-env-management",title:"Conda 环境分工与最佳实践",category:"env-config",summary:"多个 conda 环境的职责划分，如何避免环境冲突",content:`# Conda 环境分工

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
`,tags:["conda","环境","版本管理","最佳实践"],sourceFiles:["环境配置备忘录.md"]}],n=[{slug:"grep-find-cheatsheet",title:"grep 和 find 用法速查",category:"linux-tips",summary:"最常用的文件内容搜索和文件名查找命令合集，含 ripgrep 和 pdfgrep",content:'# grep 和 find 用法速查\n\n## 一、在文件内容中查找关键词\n\n| 场景 | 命令 | 说明 |\n|------|------|------|\n| 在单个文件中搜索 | `grep "关键词" 文件名` | 最基础用法 |\n| 忽略大小写 | `grep -i "关键词" 文件名` | Error 匹配 error |\n| 显示行号 | `grep -n "关键词" 文件名` | 方便定位 |\n| 递归搜索整个目录 | `grep -r "关键词" 目录/` | 搜索所有子目录 |\n| 只列出文件名 | `grep -l "关键词" *.txt` | 不显示匹配内容 |\n| 极速搜索 | `rg "关键词"` | ripgrep：默认递归、自动忽略 .gitignore |\n| 面向代码搜索 | `ag "关键词"` 或 `ack "关键词"` | 跳过备份文件、二进制文件 |\n| 搜索 PDF | `pdfgrep "关键词" 文档.pdf` | 需安装 pdfgrep |\n| 搜索 Word | 先转文本再 grep | `libreoffice --headless --convert-to txt 文档.docx` |\n\n## 二、按文件名称查找文件\n\n| 场景 | 命令 | 说明 |\n|------|------|------|\n| 精确查找 | `find /路径 -name "文件名"` | 递归查找 |\n| 通配符模糊查找 | `find . -name "*.conf"` | 所有 .conf 结尾 |\n| 忽略大小写 | `find . -iname "readme.txt"` | 匹配 README.txt 等 |\n| 只查找普通文件 | `find . -type f -name "*.log"` | -type f 排除目录 |\n| 查找并搜索内容 | `find . -name "*.html" -exec grep -l "关键词" {} \\;` | 组合使用 |\n',tags:["linux","grep","find","搜索","ripgrep"],sourceFiles:["grep和find的用法.md"]},{slug:"tar-cheatsheet",title:"tar 打包解压速查",category:"linux-tips",summary:"tar 最常用命令：创建/解压/查看 .tar/.tar.gz/.tar.bz2/.tar.xz",content:`# tar 打包解压速查

## 最简记忆法

| 字母 | 含义 |
|------|------|
| c | 压包 (create) |
| x | 解包 (extract) |
| t | 看内容 |
| v | 显示过程 (verbose) |
| f | 后面跟文件名 (file) |
| z | gzip 压缩 |
| j | bzip2 压缩 |
| J | xz 压缩（大写） |

## 最该记住的 6 条

\`\`\`bash
tar -cvf a.tar dir/           # 创建 .tar
tar -xvf a.tar                # 解压 .tar
tar -czvf a.tar.gz dir/       # 创建 .tar.gz
tar -xzvf a.tar.gz            # 解压 .tar.gz
tar -cJvf a.tar.xz dir/       # 创建 .tar.xz
tar -xJvf a.tar.xz            # 解压 .tar.xz
\`\`\`

## 查看内容（不解压）

\`\`\`bash
tar -tvf a.tar                # 查看 .tar
tar -tzvf a.tar.gz            # 查看 .tar.gz
tar -tjvf a.tar.bz2           # 查看 .tar.bz2
tar -tJvf a.tar.xz            # 查看 .tar.xz
\`\`\`

## 常用补充

\`\`\`bash
tar -xvf a.tar -C /path/to/dir    # 解压到指定目录
tar -czvf a.tar.gz dir/ --exclude="*.log"  # 排除某些文件
tar -xvf a.tar --strip-components=1        # 去掉最外层目录
\`\`\`
`,tags:["linux","tar","压缩","解压"],sourceFiles:["tar速查.txt"]}],s=[{slug:"simulation-learning-framework",title:"计算模拟实战学习法",category:"methodology",summary:"一套以「复现文献」为唯一目标、「按需学习」为核心的计算模拟学习方法论",content:`# 计算模拟实战学习法

## 一句话核心

以**复现一篇文献**为唯一目标，在行动中学会"知道自己每一步在干什么"。

## 八大法则

### 1. 入门不靠系统学，靠单点打通
- 找公认入门教程（如《Learn VASP The Hard Way》），做到第一个可重复的极简案例
- 目的是建立**最基本的操作手感**：提交任务 → 看输出 → 判断合理与否

### 2. 立刻进入"复现模式"
- **不要等"学完"**。直接选一篇本方向高被引理论文章
- 文章需要什么结果（能带、态密度、NEB、弹性常数……），就去学什么操作
- 整个过程是 **"文章驱动，按需学习"**，绝不多学当前用不到的

### 3. 顺藤摸瓜，而非从头建体系
- 遇到不懂的概念、方法、参数，就地搜索，顺着一个点摸到下一个点
- 不去追求一次性学透整个领域，**让问题链自然生长**
- 每次只问："为了看懂这篇文章的这一段/跑出这个图，我需要弄懂什么？"

### 4. AI 是副驾驶
- 写输入文件、调参数、脚本处理数据、报错排查——**细节性问题全部优先丢给 AI**
- 把节省下来的时间用在**理解物理**上
- **铁律**：AI 给出的每一段输入、每一个解释，你必须能用自己的话讲一遍大意

### 5. 最关键的能力：把模糊问题拆成清晰步骤
- 面对宏大问题（"研究这个材料的催化机理"），必须拆成可执行步骤：
  - 优化体结构 → 切面 → 算吸附能 → 算过渡态 → 分析电子结构
- 每一步都知道输入什么，期待什么输出，如何判断好坏

### 6. 永远抓住极简本质
- 任何一个方向，最根本的物理原理通常**只用一两句话就能说清**
- 遇到复杂派生问题，不断回到原点问："这和我方向的基本原理有什么关系？"

### 7. 等待计算时该做什么
- 阅读文章不是为了"看结论"，而是理解作者**为什么在这个位置算这个东西**
- 或者回头弄透之前跳过去的某个模糊概念
- 等待，是让知识链条闭环的黄金窗口

### 8. 心态：你是探究者，不是操作工
- 遇到报错、看不懂、结果奇怪，去计算化学公社问，去问同学，去让 AI 解释
- 每一次折腾，有意识地回答两个问题：
  - **我现在到底在干什么？**
  - **我为什么要这么干？**
- 能力是"折腾"出来的，不是课程教出来的
`,tags:["学习方法","计算模拟","VASP","复现","AI辅助"],sourceFiles:["skill.md"]},{slug:"efficient-ai-question-template",title:"高效向 AI 提问（dpgen 问题模板）",category:"methodology",summary:"如何用最少 token 问出最精准的 dpgen 问题，含报错类和流程类两类模板",content:`# 高效向 AI 提问（dpgen 问题模板）

## 最省 token 的问法原则

1. 先说"你要我做什么"
2. 再给"任务路径"
3. 再给"1 个现象 + 1 段关键日志"
4. 不用把整份文档贴过来
5. 不用先解释很多理论

## 报错类模板

\`\`\`
dpgen问题
路径：
命令：
最后20行日志：
我预期现象：
你帮我：定位原因并给修法
\`\`\`

## 流程类模板

\`\`\`
dpgen问题
路径：
当前轮次：
已完成到哪一步：
我改过什么：
你帮我：分析下一步
\`\`\`

## 可查文件清单（告诉 AI 可以看什么）

\`\`\`
param.json  machine.json  record.dpgen  dpgen.log
\`\`\`

## 示例

\`\`\`
问题：iter.000001 train后直接finish
路径：/home/kobe/TiC_MLP/dpgen
环境：WSL2 Ubuntu-24.04
我要你做：定位原因并给修法
可查文件：param.json machine.json record.dpgen dpgen.log
\`\`\`
`,tags:["AI","提问","dpgen","效率","模板"],sourceFiles:["codexask模版.yaml"]}],p=[{slug:"dft-materials-intro",title:"DFT 与材料计算基础",category:"comp-materials",summary:"从实战角度理解 Kohn-Sham 方程、交换关联泛函、截断能收敛与 k 点采样，不做理论推导只讲怎么用",content:`# DFT 与材料计算基础

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
  第三阶: meta-GGA (SCAN, r\xb2SCAN)（包含动能密度）
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
k_i \xd7 a_i ≈ 30–40 \xc5  （大多数计算）
k_i \xd7 a_i ≈ 20–25 \xc5  （初步粗算）
\`\`\`

其中 a_i 是晶格常数（\xc5），k_i 是该方向的 k 点数。

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
2. 查 POTCAR 中 ENMAX → 设 ENCUT = 1.3 \xd7 max(ENMAX)
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
`,tags:["DFT","Kohn-Sham","交换关联泛函","ENCUT","k点","VASP","收敛测试"],sourceFiles:["dft-materials-intro.md"]},{slug:"band-structure-dos",title:"能带结构与态密度分析实战",category:"comp-materials",summary:"从 VASP 输出提取能带和态密度数据，用 Python 画图并解读电子结构特征（带隙/有效质量/轨道投影）",content:`# 能带结构与态密度分析实战

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
m* = ℏ\xb2 / (d\xb2E/dk\xb2)
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
`,tags:["能带结构","态密度","DOS","电子结构","VASP","pymatgen","带隙"],sourceFiles:["band-structure-dos.md"]},{slug:"elastic-constants-dft",title:"DFT 计算弹性常数与力学性质",category:"comp-materials",summary:"应力-应变法计算弹性常数矩阵 Cij，通过 VRH 近似推导体模量/剪切模量/杨氏模量和泊松比",content:`# DFT 计算弹性常数与力学性质

## 弹性常数矩阵

对于一般晶体，弹性常数是 6\xd76 矩阵 Cij（Voigt 记号）：

\`\`\`text
应力 σ_i = Σ_j C_{ij} \xd7 应变 ε_j    (i,j = 1..6)
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
2. 对每种应变模式施加 \xb11%, \xb12% 应变
3. 对每个变形结构做静态计算 → 提取应力张量
4. 用 σ = C\xb7ε 线性拟合求 Cij
\`\`\`

## VASP 实现

### Step 1: 弛豫
\`\`\`bash
# INCAR 弛豫设置
IBRION = 2
ISIF = 3       # 同时优化原子位置+晶格+体积
NSW = 100
EDIFFG = -0.001 # 力收敛标准 eV/\xc5
ENCUT = 1.3 \xd7 ENMAX   # 略高于通常值（弹性对截断能敏感）
PREC = Accurate
\`\`\`

### Step 2: VASP 应变计算
\`\`\`bash
# INCAR 弹性常数直接计算（IBRION=6 应力-应变法）
IBRION = 6
ISIF = 3
NFREE = 2      # 每个方向 \xb12 个位移
POTIM = 0.015  # 位移幅度 \xc5
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

1. **截断能要足够高**：弹性常数对 ENCUT 敏感，推荐 ENCUT = 1.5 \xd7 max(ENMAX)
2. **k 点要加密**：推荐密度 ≥ 40 \xc5
3. **应变幅度要收敛**：试 0.5%, 1%, 2%，选 Cij 不随幅度变化的最小值
4. **结构的 Ising 效应**：弛豫要收敛到每原子受力 < 0.001 eV/\xc5
`,tags:["弹性常数","Cij","VRH","体模量","剪切模量","杨氏模量","Pugh判据"],sourceFiles:["elastic-constants-dft.md"]},{slug:"phonon-thermodynamics",title:"声子谱与热力学性质计算",category:"comp-materials",summary:"有限位移法 + Phonopy 计算声子色散、态密度，从声子 DOS 推导自由能/热容/熵的温度依赖性",content:`# 声子谱与热力学性质计算

## 为什么算声子

| 性质 | 从声子得到什么 |
|------|-------------|
| 动力学稳定性 | 无虚频 → 结构是势能面局部极小 |
| 热容 Cv(T) | 声子 DOS 积分 → 低温 T\xb3 律，高温 Dulong-Petit |
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
Step 1: 弛豫原胞 → 目标：力 < 1E-5 eV/\xc5
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
# 声子频率变化 < 1 cm⁻\xb9 即可
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
- **Γ 点有较小虚频（< 1 cm⁻\xb9）**：可能数值噪声，忽略或增大超胞
- **遍布布里渊区的虚频**：结构不稳定！需要重新弛豫或考虑软模相变
- **偏离 Γ 点的虚频**：CDW（电荷密度波）或结构相变的信号

### 声子 DOS 特征
\`\`\`text
低频区 (0-200 cm⁻\xb9)：重原子、声学支 → Debye 模型
中频区 (200-600 cm⁻\xb9)：键弯曲、较轻原子
高频区 (> 600 cm⁻\xb9)：轻原子—轻原子键伸缩 (C-H, O-H, etc.)
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

1. **弛豫到极致**：力收敛标准要 ≤ 1E-5 eV/\xc5，不然虚频可能是残余应力造成的
2. **ENCUT 保持一致**：Phonopy 的所有位移结构要使用相同的 ENCUT（包括弛豫阶段）
3. **POTCAR 不要换**：所有计算从头到尾用同一个 POTCAR
4. **超胞越大声子越准**：2\xd72\xd72 是最小要求，3\xd73\xd73 是实际推荐
5. **非极性半导体注意**：LO-TO 劈裂需要 Born 有效电荷修正
`,tags:["声子","Phonopy","热力学","有限位移","晶格动力学","自由能"],sourceFiles:["phonon-thermodynamics.md"]}],r=[{slug:"md-fundamentals",title:"分子动力学模拟基础与实战要点",category:"atomistic-sim",summary:"Verlet 积分、系综选择、thermostat/barostat 原理、timestep 选择、平衡判断，从零理解 MD 核心概念",content:`# 分子动力学模拟基础与实战要点

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
v(t + Δt/2) = v(t) + a(t)\xb7Δt/2
r(t + Δt)   = r(t) + v(t + Δt/2)\xb7Δt
a(t + Δt)   = F(r(t+Δt)) / m
v(t + Δt)   = v(t + Δt/2) + a(t + Δt)\xb7Δt/2
\`\`\`

**优点**：时间可逆、辛结构（能量长期守恒）、实现简单。

## Timestep 选择

| 体系 | 推荐 Δt | 最快运动 |
|------|--------|---------|
| 原子/金属（重原子） | 1.0 fs | C-H 伸缩 ~10 fs |
| 含 H 的有机分子 | 0.5 fs | O-H 伸缩 ~10 fs |
| 粗粒化模型 | 10-50 fs | 珠子扩散 |
| 含离子液体 | 0.25 fs | H⁺ 跳跃 |

**铁律**：Δt ≤ 最快振动周期的 1/10。C-H 伸缩 ~3000 cm⁻\xb9 → 周期 ~10 fs → Δt ≤ 1 fs。

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
| Nos\xe9-Hoover | 扩展 Lagrangian | 平衡态采样最佳 | 对小体系/高频体系可能不够强 |
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
☐ 温度在目标值 \xb1 5% 内振荡（无漂移）
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
`,tags:["分子动力学","MD","Verlet","系综","恒温器","平衡","timestep"],sourceFiles:["md-fundamentals.md"]},{slug:"lammps-input-practical",title:"LAMMPS 输入文件编写实战",category:"atomistic-sim",summary:"完整 LAMMPS input 模板：单位系统、势函数选择、能量最小化、弛豫、生产运行、轨迹分析全流程",content:`# LAMMPS 输入文件编写实战

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
| **metal** | eV | \xc5 | ps | 金属、半导体、DFT |
| real | kcal/mol | \xc5 | fs | 生物、有机、经典力场 |
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
fix 1 all nvt temp 300 300 0.1       # Nos\xe9-Hoover NVT
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
`,tags:["LAMMPS","input","MD","势函数","EAM","轨迹分析","dump"],sourceFiles:["lammps-input-practical.md"]},{slug:"mc-materials-science",title:"蒙特卡洛方法在材料科学中的应用",category:"atomistic-sim",summary:"Metropolis 算法原理、巨正则 MC、半巨正则 MC、与 MD 的互补关系，附 Python 示例",content:`# 蒙特卡洛方法在材料科学中的应用

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
            p_acc = V / (Λ\xb3*(N+1)) * exp(-(new_E - E - mu) / kT)
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
`,tags:["蒙特卡洛","MC","Metropolis","GCMC","吸附等温线","相变"],sourceFiles:["mc-materials-science.md"]},{slug:"ml-potentials-overview",title:"机器学习势函数全景概述",category:"atomistic-sim",summary:"DeePMD、ACE、MTP、GAP、NNP 五大 ML 势函数架构对比、选型指南、精度-速度-数据效率三角权衡",content:`# 机器学习势函数全景概述

## 为什么要 ML 势

| 方法 | 精度 | 速度 (atom\xb7step) | 可跑体系 |
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
数据量 < 10\xb3 帧，追求极致精度 → GAP（数据效率）
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
| DeePMD (se_e2_a) | ~10⁴ | ~10⁴\xd7 |
| ACE (PACE) | ~10⁵ | ~10⁵\xd7 |
| MTP | ~10⁴ | ~10⁴\xd7 |
| GAP (SOAP) | ~10\xb2 | ~10\xb2\xd7 |
| NequIP (Allegro) | ~10\xb3 | ~10\xb3\xd7 |

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
`,tags:["ML势函数","DeePMD","ACE","MTP","GAP","NNP","MACE","CHGNet"],sourceFiles:["ml-potentials-overview.md"]},{slug:"ase-practical-workflow",title:"ASE 实战：结构操作与高通量计算",category:"atomistic-sim",summary:"ASE 构建结构、读写格式文件、设置 calculator、跑弛豫、做高通量筛选的全流程 Python 代码",content:`# ASE 实战：结构操作与高通量计算

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
cu_sc = cu * (3, 3, 3)                   # 3\xd73\xd73 超胞

# 2. 切表面
cu111 = fcc111('Cu', a=3.61, size=(2, 2, 4), vacuum=10.0)
# → 2\xd72 面内，4 层原子，10 \xc5 真空层

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
opt.run(fmax=0.02)  # 力收敛到 0.02 eV/\xc5
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
`,tags:["ASE","结构操作","calculator","高通量","弛豫","Phonopy"],sourceFiles:["ase-practical-workflow.md"]},{slug:"phonopy-phono3py-workflow",title:"晶格动力学工具：Phonopy + phono3py 实战",category:"atomistic-sim",summary:"从二阶力常数到声子谱/态密度，三阶力常数到声子寿命和晶格热导率，完整计算管线",content:`# 晶格动力学工具：Phonopy + phono3py 实战

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

phono3py 需要算**三阶力常数**（Φ₃），即两个原子同时产生位移时的力。计算量是 Phonopy 的 O(N_atom \xd7 n_displacements) 倍。

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

# phono3py 输出 linewidth → 声子寿命 τ = 1/(2\xd7linewidth)
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
| 超胞尺寸 | 2\xd72\xd72 → 4\xd74\xd74 | 声子频率变化 < 1 cm⁻\xb9 |
| q 点网格 (DOS) | 11\xb3 → 31\xb3 | Cv 变化 < 1% |
| q 点网格 (κ_L) | 11\xb3 → 25\xb3 | κ_L 变化 < 5% |
| 截断半径 (三阶) | 3rd NN → 6th NN | κ_L 变化 < 5% |

## 实战加速策略

1. **对称性减少位移数**：\`--pa="auto"\` 利用空间群减少位移对
2. **超胞不要太大**：2\xd72\xd72 对简谐够用，3\xd73\xd73 对非简谐通常是实践上限
3. **先跑 Phonopy 再跑 phono3py**：用 Phonopy 确认结构稳定（无虚频）再做非简谐
4. **力收敛要更严格**：三阶力常数对力误差更敏感（推荐 EDIFF=1E-8）
`,tags:["Phonopy","phono3py","晶格动力学","声子寿命","热导率","RTA"],sourceFiles:["phonopy-phono3py-workflow.md"]}],l=[{slug:"ovito-basics",title:"OVITO 基础操作与数据导入",category:"ovito-tips",summary:"OVITO Pro GUI 界面、Pipeline 编辑器、LAMMPS/POSCAR/XYZ 格式导入、视图操作与基础可视化",content:`# OVITO 基础操作与数据导入

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
- **周期性边界显示**：Simulation cell → ☑ Show periodic images (N\xd7N\xd7N)
`,tags:["OVITO","可视化","LAMMPS","dump","Pipeline","数据导入"],sourceFiles:["ovito-basics.md"]},{slug:"ovito-cna-ptm",title:"晶体结构识别：CNA 与 PTM 实战",category:"ovito-tips",summary:"使用 CommonNeighborAnalysis 和 PolyhedralTemplateMatching 识别 FCC/BCC/HCP 结构，统计结构占比随时间演化",content:`# 晶体结构识别：CNA 与 PTM 实战

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
    # FixedCutoff: 手动设置 cutoff（如 3.5 \xc5）
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
`,tags:["OVITO","CNA","PTM","结构识别","FCC","HCP","BCC","Python"],sourceFiles:["ovito-cna-ptm.md"]},{slug:"ovito-dxa-defects",title:"缺陷与位错分析：DXA + Wigner-Seitz",category:"ovito-tips",summary:"DislocationAnalysis (DXA) 提取位错线/密度/Burgers 矢量，Wigner-Seitz 分析点缺陷，大体系 DXA 内存优化",content:`# 缺陷与位错分析：DXA + Wigner-Seitz

## DXA（Dislocation Analysis）能做什么

DXA 从原子坐标中提取位错网络：

| 输出量 | 含义 |
|--------|------|
| 位错线 | 每条线的路径和 Burgers 矢量 |
| 位错密度 ρ = L/V | 总位错线长 / 体积 (m⁻\xb2) |
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
print(f"位错密度: {total_line_length / cell_volume:.3e} \xc5⁻\xb2 = {total_line_length / cell_volume * 1e20:.1f} \xd7 10\xb9⁴ m⁻\xb2")

# 统计伯氏矢量分布
burgers_vectors = data.dislocations['dislocations/Burgers vector']
for bv in burgers_vectors:
    print(f"Burgers vector: ({bv[0]:.2f}, {bv[1]:.2f}, {bv[2]:.2f}), "
          f"length: {np.linalg.norm(bv):.3f} \xc5")
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
        return f"Other (|b|={b_mag:.3f} \xc5)"
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
`,tags:["OVITO","DXA","位错分析","Wigner-Seitz","缺陷","Burgers矢量","位错密度"],sourceFiles:["ovito-dxa-defects.md"]},{slug:"ovito-python-scripting",title:"OVITO Python 脚本自动化与高质量渲染",category:"ovito-tips",summary:"ovito Python 模块批量处理、Pipeline 编程、自定义 modifier 函数、Tachyon 光线追踪渲染发表级图像",content:`# OVITO Python 脚本自动化与高质量渲染

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
            # CSP = sum|R_i + R_{i+6}|\xb2  (对 6 对相反邻居)
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
`,tags:["OVITO","Python","批处理","Tachyon","渲染","自定义modifier","HPC"],sourceFiles:["ovito-python-scripting.md"]}];var d=e.i(95228);let m=[{id:"deepmd-install",source:"deepmd",title:"DeePMD-kit 安装指南",summary:"DeePMD-kit 的 conda/pip/源码安装方法，支持 TensorFlow 和 PyTorch 后端",content:`DeePMD-kit 支持通过 conda、pip 和源码三种方式安装。
推荐使用 conda 安装以获取预编译的 GPU 支持：
conda create -n deepmd deepmd-kit=*=*gpu libdeepmd=*=*gpu lammps-dp -c https://conda.deepmodeling.com
安装后验证：dp --version`,url:"https://docs.deepmodeling.com/projects/deepmd/en/latest/getting-started/install.html",tags:["deepmd","安装","conda","GPU"]},{id:"deepmd-input-json",source:"deepmd",title:"input.json 训练参数完整参考",summary:"DeePMD 训练的 input.json 所有参数说明，包括 model/descriptor/fitting_net/loss/lr 等",content:`input.json 是 DeePMD 训练的核心配置文件。主要段：
- model: 模型配置，含 descriptor（描述符）和 fitting_net（拟合网络）
- learning_rate: 学习率策略（exp/cosine/阶梯衰减）
- loss: 损失函数权重（能量/力/virial 的 pref）
- training: 训练参数（numb_steps, seed, disp_file 等）

Descriptor 类型选择：
- se_e2_a: 最常用，适合大多数体系
- se_e3: 含三角特征，精度更高但更慢
- hybrid: 混合多个 descriptor`,url:"https://docs.deepmodeling.com/projects/deepmd/en/latest/training/train-input.html",tags:["deepmd","input.json","训练参数","descriptor"]},{id:"deepmd-committee",source:"deepmd",title:"DP-GEN 主动学习原理",summary:"DP-GEN 使用 committee model + model deviation 来筛选需要 DFT 标注的构型",content:`DP-GEN 的主动学习流程：
1. 用初始 DFT 数据训练 4 个独立模型（不同随机种子）
2. 用 LAMMPS 做 MD 探索构型空间
3. 计算 model deviation（4 个模型间的力标准差）
4. 偏差大的构型 → 送 VASP 标注
5. 新标注数据加入训练集 → 重新训练 → 循环

收敛判据：candidate 比例 < 某阈值（通常 5%），
或 accurate 比例 > 某阈值（通常 80%）`,url:"https://docs.deepmodeling.com/projects/dpgen/en/latest/theory.html",tags:["dpgen","主动学习","committee","model_devi"]},{id:"deepmd-v2-vs-v3",source:"deepmd",title:"DeePMD-kit v2 vs v3 差异",summary:"v3 引入 PyTorch 后端、改进的 descriptor、更好的 GPU 利用率",content:`DeePMD-kit v3 相比 v2 的主要变化：
- 新增 PyTorch 后端（同时保留 TensorFlow 后端）
- 改进的 se_e2_a descriptor 实现
- 更好的多 GPU 训练支持
- 与 dpgen v0.13+ 的兼容性改进
- 训练速度提升（尤其在大体系上）

注意：dpgen run 对 DeePMD-kit 版本敏感，建议用 dpgen 推荐版本`,url:"https://docs.deepmodeling.com/projects/deepmd/en/latest/releases.html",tags:["deepmd","版本","v2","v3"]},{id:"deepmd-freeze",source:"deepmd",title:"模型冻结：dp freeze",summary:"将训练 checkpoint 导出为 .pb 文件用于推理",content:`dp freeze 命令用于将训练产生的 checkpoint 导出为单一的 .pb 文件。
基本用法：dp freeze -o graph.pb
选项：
- -o: 输出文件名
- --united-model: 导出单个统一模型
- --iteration: 指定 checkpoint 步数

.pb 文件可用于：
- LAMMPS pair_style deepmd
- dp test / dp compress
- dpgen 的 model_devi 阶段`,url:"https://docs.deepmodeling.com/projects/deepmd/en/latest/operation/freeze.html",tags:["deepmd","dp freeze","模型导出",".pb"]},{id:"vasp-incar-tags",source:"vasp",title:"INCAR 标签完整参考",summary:"VASP INCAR 中所有标签的详细说明，包括电子步、离子步、并行化等",content:`INCAR 中常用标签分类：

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
- LWAVE: 是否写 WAVECAR`,url:"https://www.vasp.at/wiki/index.php/Category:INCAR_tag",tags:["vasp","INCAR","参数","电子步","离子步"]},{id:"vasp-kpoints-guide",source:"vasp",title:"KPOINTS 与 KSPACING 设置指南",summary:"VASP 中 K 点采样的两种方式：KPOINTS 文件 vs KSPACING 自动生成",content:`K 点设置有两种互斥的方式：

【方式一：KPOINTS 文件】
- 格式：Gamma-centered 或 Monkhorst-Pack
- 网格必须为整数（如 1 1 1, 2 2 2）
- DP-GEN 生成时有 float bug，建议手动提供

【方式二：KSPACING（推荐用于 VASP 5.4+）】
- 在 INCAR 中设置 KSPACING = 0.15（约对应 2π\xd70.15 的 k 点密度）
- VASP 根据晶胞大小自动确定网格
- DP-GEN 默认使用此方式
- 配合 KGAMMA = .TRUE. 使用 Gamma-centered 网格

【K 点测试】
- 通常以总能量收敛 1 meV/atom 为标准
- 越来越密的 K 点直到能量不再变化`,url:"https://www.vasp.at/wiki/index.php/KPOINTS",tags:["vasp","KPOINTS","KSPACING","K点"]},{id:"vasp-common-errors",source:"vasp",title:"VASP 常见报错与解决",summary:"VASP 运行中最常见的报错信息、原因和解决方法",content:`常见 VASP 报错：

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
- 这不是报错！是离子步成功收敛的标志`,url:"https://www.vasp.at/wiki/index.php/Category:Troubleshooting",tags:["vasp","报错","调试","SIGSEGV","收敛"]},{id:"vasp-potcar-guide",source:"vasp",title:"POTCAR / 赝势选择指南",summary:"VASP 赝势类型（PBE/PBEsol/LDA）的选择和 POTCAR 生成方法",content:`POTCAR（赝势文件）是 VASP 计算的核心输入。

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
- 精度要求高（弹性常数等）：选价电子多的版本`,url:"https://www.vasp.at/wiki/index.php/Available_pseudopotentials",tags:["vasp","POTCAR","赝势","PBE"]},{id:"lammps-pair-deepmd",source:"lammps",title:"pair_style deepmd 命令",summary:"LAMMPS 中使用 DeePMD 势的 pair_style 语法和参数",content:`在 LAMMPS 中使用 DeePMD 势：

\`\`\`
pair_style deepmd graph.pb
pair_coeff * *
\`\`\`

或指定原子类型映射：
\`\`\`
pair_style deepmd graph.pb
pair_coeff * * Ti C
\`\`\`

【关键点】
- graph.pb 必须是 dp freeze 导出的冻结模型
- type_map 中的元素顺序必须与 LAMMPS 原子类型对应
- 需要 LAMMPS 的 USER-DEEPMD 包（lmp -h 检查 deepmd 是否在已安装包列表中）

【units】
- DeePMD 模型使用 metal units
- LAMMPS 中必须设置 units metal

【性能】
- 支持 GPU 加速（需编译时链接 GPU 版本的 libdeepmd）
- OMP_NUM_THREADS 可控制 CPU 并行`,url:"https://docs.lammps.org/pair_deepmd.html",tags:["lammps","deepmd","pair_style","势函数"]},{id:"lammps-units-metal",source:"lammps",title:"LAMMPS metal units",summary:"DeePMD 训练使用 metal units，LAMMPS 中需要对应设置",content:`metal units 下各物理量的单位：
- 距离: \xc5ngstr\xf6m (\xc5)
- 时间: picoseconds (ps)
- 能量: eV
- 力: eV/\xc5
- 压力: bars
- 质量: grams/mole
- 温度: Kelvin (K)

与 real units 的区别：real units 能量用 kcal/mol。

DeePMD 模型的输出单位是 eV 和 eV/\xc5，所以必须用 metal units。

【典型设置】
\`\`\`
units metal
timestep 0.001  # 1 fs
\`\`\``,url:"https://docs.lammps.org/units.html",tags:["lammps","units","metal","DeePMD"]},{id:"lammps-input-example",source:"lammps",title:"LAMMPS + DeePMD 完整输入示例",summary:"一个使用 DeePMD 势跑 NVT MD 的完整 LAMMPS input 脚本",content:`\`\`\`lammps
# NVT MD with DeePMD potential
units metal
atom_style atomic
boundary p p p

read_data data.lmp

pair_style deepmd graph.pb
pair_coeff * *

velocity all create 300.0 12345

fix 1 all nvt temp 300.0 300.0 0.1

thermo 100
thermo_style custom step temp pe ke etotal press vol

dump 1 all custom 100 traj.lammpstrj id type x y z

timestep 0.001
run 10000
\`\`\`

【参数说明】
- timestep 0.001 = 1 fs（适合大多数体系）
- fix nvt: Nos\xe9-Hoover 恒温器
- thermo 100: 每 100 步输出一次热力学量
- dump: 每 100 步输出一次轨迹`,url:"https://docs.lammps.org/Howto_bash.html",tags:["lammps","deepmd","input","NVT","MD"]},{id:"lammps-fix-nvt",source:"lammps",title:"fix nvt / npt 命令",summary:"恒温恒压控制方法，DP-GEN explore 阶段常用 NVT 和 NPT",content:`【fix nvt】恒温恒体积（NVT 系综）
fix 1 all nvt temp 300 300 0.1
- 第1个参数：起始温度
- 第2个参数：目标温度
- 第3个参数：温度阻尼时间（通常 0.1 ps = 100 timesteps）

【fix npt】恒温恒压（NPT 系综）
fix 1 all npt temp 300 300 0.1 iso 1.0 1.0 1.0
- iso: 各向同性压强控制
- 第1个参数：起始压强 (bar)
- 第2个参数：目标压强 (bar)
- 第3个参数：压强阻尼时间

【DP-GEN 使用】
- iter 0 通常用 NVT（收集不同温度下的构型）
- 后续 iter 可用 NPT（让体积松弛）
- model_devi_dt 控制 MD 步长
- model_devi_skip 控制输出频率`,url:"https://docs.lammps.org/fix_nh.html",tags:["lammps","fix","NVT","NPT","dpgen"]}];e.s(["officialDocs",0,m],27255);let c=[...t,...i,...o,...a,...n,...s,...p,...r,...l];e.s(["allArticles",0,c,"buildAllSearchIndex",0,function(){let e=[];for(let t of c)e.push({id:t.slug,title:t.title,content:t.summary+" "+t.content.slice(0,500),category:t.category,url:`/learn/${t.slug}`,type:"article"});for(let t of m)e.push({id:t.id,title:t.title,content:t.summary+" "+t.content,category:`official-${t.source}`,url:t.url,type:"doc"});for(let t of d.cheatsheetItems)e.push({id:t.id,title:t.label,content:t.description+" "+t.code,category:t.category,url:"/cheatsheet",type:"cheatsheet"});return e}],94757)}]);