(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,95228,e=>{"use strict";let t=[{id:"cmd-dpgen-run",category:"command",label:"启动 dpgen",description:"在项目目录下启动 dpgen 主动学习",code:"dpgen run param.json machine.json 2>&1 | tee -a dpgen.log",tags:["dpgen","启动"]},{id:"cmd-dp-train",category:"command",label:"DeePMD 训练",description:"使用 input.json 训练 DeePMD 模型",code:"dp train input.json",tags:["deepmd","训练"]},{id:"cmd-dp-freeze",category:"command",label:"冻结模型",description:"将 checkpoint 转为 .pb 文件",code:"dp freeze -o graph.pb",tags:["deepmd","模型导出"]},{id:"cmd-lmp-deepmd",category:"command",label:"LAMMPS + DeePMD",description:"使用 DeePMD 势的 LAMMPS 运行",code:"lmp -in input.lammps",tags:["lammps","deepmd"]},{id:"cmd-vasp-run",category:"command",label:"运行 VASP",description:"标准 VASP 运行命令（单节点）",code:"mpirun -np $NP /path/to/vasp_std > vasp.out 2>&1",tags:["vasp","mpi"]},{id:"cmd-qsub",category:"command",label:"提交 PBS 作业",description:"提交作业到超算 batch 队列",code:"qsub job.pbs",tags:["pbs","超算"]},{id:"cmd-qstat",category:"command",label:"查看作业状态",description:"查看当前用户在 PBS 队列中的作业",code:"qstat -u student2025",tags:["pbs","监控"]},{id:"cmd-qdel",category:"command",label:"删除作业",description:"从 PBS 队列中删除指定作业",code:"qdel 12345",tags:["pbs","运维"]},{id:"cmd-tail-log",category:"command",label:"查看最新日志",description:"查看 dpgen 日志最后 20 行",code:"tail -20 dpgen.log",tags:["日志","监控"]},{id:"cmd-grep-error",category:"command",label:"搜索日志报错",description:"在 dpgen 日志中搜索错误关键词",code:'grep -iE "error|exception|killed|oom|segfault|traceback|failed" dpgen.log | tail -20',tags:["日志","调试"]},{id:"cmd-kill-all",category:"command",label:"停止所有 dpgen 进程",description:"一键杀掉训练+探索+标注",code:'pkill -9 -f "dpgen run"; pkill -9 -f lmp; pkill -9 -f vasp; pkill -9 -f deepmd; pkill -9 -f "dp train"',tags:["进程","运维"]},{id:"cmd-scp-upload",category:"command",label:"上传文件到超算",description:"用 scp 上传到超算服务器的 dpgen 工作目录",code:"scp file student2025@10.157.197.40:/public/home/student2025/zhuangjingrun/dpgen_work/",tags:["scp","超算","传输"]},{id:"cmd-conda-activate",category:"command",label:"激活 conda 环境",description:"训练用 deepmd，dpgen 用 deepmd2",code:"conda activate deepmd2  # dpgen\nconda activate deepmd   # train",tags:["conda","环境"]},{id:"param-trust-lo",category:"param",label:"model_devi_f_trust_lo",description:"力偏差下界（eV/Å），低于此值认为模型准确",code:'"model_devi_f_trust_lo": 0.05',tags:["dpgen","信任度"]},{id:"param-trust-hi",category:"param",label:"model_devi_f_trust_hi",description:"力偏差上界（eV/Å），高于此值触发 VASP 标注",code:'"model_devi_f_trust_hi": 0.35',tags:["dpgen","信任度"]},{id:"param-numb-models",category:"param",label:"numb_models",description:"Committee 模型数量，通常为 4",code:'"numb_models": 4',tags:["dpgen","训练"]},{id:"param-numb-steps",category:"param",label:"numb_steps",description:"每轮训练的总步数",code:'"numb_steps": 400000',tags:["deepmd","训练"]},{id:"param-rcut",category:"param",label:"rcut / rcut_smth",description:"截断半径与平滑截断起点（Å）",code:'"rcut": 6.5,\n"rcut_smth": 5.0',tags:["deepmd","descriptor"]},{id:"param-sel",category:"param",label:"sel (近邻数)",description:"每种元素的截断半径内最大近邻原子数",code:'"sel": [40, 40]',tags:["deepmd","descriptor"]},{id:"param-fp-task-max",category:"param",label:"fp_task_max / fp_task_min",description:"每轮最多/最少 VASP 标注数",code:'"fp_task_max": 50,\n"fp_task_min": 1',tags:["dpgen","fp"]},{id:"path-local-dp-train",category:"path",label:"dp (训练)",description:"deepmd 环境中的 dp 可执行文件",code:"/home/kobe/miniconda3/envs/deepmd/bin/dp",tags:["deepmd","本地路径"]},{id:"path-local-dpgen",category:"path",label:"dpgen",description:"deepmd2 环境中的 dpgen 可执行文件",code:"/home/kobe/miniconda3/envs/deepmd2/bin/dpgen",tags:["dpgen","本地路径"]},{id:"path-local-lmp",category:"path",label:"lmp (DeePMD版)",description:"deepmd 环境中的 LAMMPS",code:"/home/kobe/miniconda3/envs/deepmd/bin/lmp",tags:["lammps","本地路径"]},{id:"path-hpc-vasp",category:"path",label:"vasp_std (超算)",description:"超算上的 VASP 可执行文件",code:"/public/software/vasp.5.4.4/bin/vasp_std",tags:["vasp","超算路径"]},{id:"path-hpc-intel",category:"path",label:"Intel 环境 (超算)",description:"超算 Intel 编译环境初始化脚本",code:"source /public/software/intel2020u2/intel2020u2_env.sh",tags:["超算路径","环境"]},{id:"path-hpc-work",category:"path",label:"dpgen 工作目录 (超算)",description:"超算上 dpgen 的 remote_root",code:"/public/home/student2025/zhuangjingrun/dpgen_work/",tags:["dpgen","超算路径"]},{id:"path-local-project",category:"path",label:"项目根目录",description:"TiC MLP 项目的本地根目录",code:"~/vasp_run/TiC_MLP/",tags:["项目","本地路径"]},{id:"script-clean-startup",category:"script",label:"干净环境启动",description:"避免 conda 污染 VASP 动态库的启动脚本",code:`#!/bin/bash
source /home/kobe/miniconda3/etc/profile.d/conda.sh
conda activate dpgen_test_env
unset LD_LIBRARY_PATH
export PATH=/home/kobe/miniconda3/envs/dpgen_test_env/bin:/usr/local/bin:/usr/bin:/bin
dpgen run param.json machine.json`,tags:["启动","脚本","环境"]},{id:"script-watch-dpgen",category:"script",label:"dpgen 监控脚本",description:"每30秒检查进程存活+报错扫描+进度显示",code:`#!/bin/bash
while true; do
  pgrep -f "dpgen run" > /dev/null && echo "✅ running" || echo "❌ dead"
  tail -100 dpgen.log | grep -iE "error|failed" | tail -5
  sleep 30
done`,tags:["监控","脚本","dpgen"]}];e.s(["cheatsheetItems",0,t])},94757,27255,e=>{"use strict";let t=[{slug:"dpgen-workflow-overview",title:"DP-GEN 完整工作流与目录模板",category:"dpgen-workflow",summary:"从初始 DFT 数据到最终势函数的完整 MLP 主动学习闭环，含标准目录模板",content:`# DP-GEN 完整工作流与目录模板

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
`,tags:["dpgen","model_devi","candidate","信任度","调参"],sourceFiles:["dpgen常用检查指令.txt"]}],s=[{slug:"deepmd-training-params",title:"DeePMD 训练参数详解",category:"deepmd-training",summary:"TiC MLP 项目的完整训练参数配置（descriptor、fitting_net、学习率、batch_size 等）",content:`# DeePMD 训练参数详解

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
`,tags:["deepmd","数据回流","OUTCAR","dpdata","训练集"],sourceFiles:["工作流程以及模版文件夹.md"]}],i=[{slug:"vasp-pbs-templates",title:"VASP PBS 任务模板（独立任务 + 批量FP）",category:"vasp-hpc",summary:"两个万能 PBS 模板：独立单任务和 DP-GEN 批量 FP，含所有占位符替换清单",content:`# VASP PBS 任务模板

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
`,tags:["VASP","FP","检查","PBS","提交前"],sourceFiles:["手动fp.txt"]}],r=[{slug:"env-config-overview",title:"环境配置总览（本地 + 超算）",category:"env-config",summary:"TiC MLP 项目的完整环境配置，本地 WSL2 Ubuntu + 超算服务器的路径、Conda 环境、软件版本对照",content:`# 环境配置总览

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
`,tags:["linux","tar","压缩","解压"],sourceFiles:["tar速查.txt"]}],a=[{slug:"simulation-learning-framework",title:"计算模拟实战学习法",category:"methodology",summary:"一套以「复现文献」为唯一目标、「按需学习」为核心的计算模拟学习方法论",content:`# 计算模拟实战学习法

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
`,tags:["AI","提问","dpgen","效率","模板"],sourceFiles:["codexask模版.yaml"]}];var o=e.i(95228);let d=[{id:"deepmd-install",source:"deepmd",title:"DeePMD-kit 安装指南",summary:"DeePMD-kit 的 conda/pip/源码安装方法，支持 TensorFlow 和 PyTorch 后端",content:`DeePMD-kit 支持通过 conda、pip 和源码三种方式安装。
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
- model_devi_skip 控制输出频率`,url:"https://docs.lammps.org/fix_nh.html",tags:["lammps","fix","NVT","NPT","dpgen"]}];e.s(["officialDocs",0,d],27255);let l=[...t,...s,...i,...r,...n,...a];e.s(["allArticles",0,l,"buildAllSearchIndex",0,function(){let e=[];for(let t of l)e.push({id:t.slug,title:t.title,content:t.summary+" "+t.content.slice(0,500),category:t.category,url:`/learn/${t.slug}`,type:"article"});for(let t of d)e.push({id:t.id,title:t.title,content:t.summary+" "+t.content,category:`official-${t.source}`,url:t.url,type:"doc"});for(let t of o.cheatsheetItems)e.push({id:t.id,title:t.label,content:t.description+" "+t.code,category:t.category,url:"/cheatsheet",type:"cheatsheet"});return e}],94757)},99833,74581,51462,e=>{"use strict";e.s(["CATEGORY_META",0,{"dpgen-workflow":{label:"DP-GEN 工作流",icon:"🔄",color:"bg-blue-100 text-blue-800"},"deepmd-training":{label:"DeePMD 训练",icon:"🧠",color:"bg-purple-100 text-purple-800"},"vasp-hpc":{label:"VASP / 超算",icon:"💻",color:"bg-green-100 text-green-800"},"env-config":{label:"环境配置",icon:"⚙️",color:"bg-orange-100 text-orange-800"},"linux-tips":{label:"Linux 速查",icon:"🐧",color:"bg-cyan-100 text-cyan-800"},methodology:{label:"学习方法论",icon:"💡",color:"bg-pink-100 text-pink-800"}}],99833);var t=e.i(43476),s=e.i(71645);let i="dp-learn-progress";function r(){try{let e=localStorage.getItem(i);return e?JSON.parse(e):{}}catch{return{}}}function n(e){return r()[e]??null}function a(e){let t=r(),s=t[e];return s?.completed?delete t[e]:t[e]={slug:e,completed:!0,completedAt:new Date().toISOString()},localStorage.setItem(i,JSON.stringify(t)),t[e]??{slug:e,completed:!1}}e.s(["getCategoryProgress",0,function(e){let t=r(),s=e.length,i=e.filter(e=>t[e]?.completed).length;return{completed:i,total:s,percent:s>0?Math.round(i/s*100):0}},"getProgress",0,n,"resetAllProgress",0,function(){localStorage.removeItem(i)},"toggleProgress",0,a],74581),e.s(["ProgressBar",0,function({completed:e,total:s}){let i=s>0?Math.round(e/s*100):0;return(0,t.jsxs)("div",{className:"flex items-center gap-3",children:[(0,t.jsx)("div",{className:"flex-1 h-2 bg-zinc-200 rounded-full overflow-hidden",children:(0,t.jsx)("div",{className:"h-full bg-green-500 rounded-full transition-all duration-500 ease-out",style:{width:`${i}%`}})}),(0,t.jsxs)("span",{className:"text-sm font-medium text-zinc-600 shrink-0",children:[e,"/",s," (",i,"%)"]})]})},"ProgressCheck",0,function({slug:e}){let[i,r]=(0,s.useState)(!1),[o,d]=(0,s.useState)(!1);return((0,s.useEffect)(()=>{d(!0);let t=n(e);r(t?.completed??!1)},[e]),o)?(0,t.jsx)("button",{onClick:()=>{let t=a(e);r(!!t?.completed)},className:`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${i?"bg-green-500 border-green-500 text-white":"border-zinc-300 hover:border-green-400 bg-white"}`,title:i?"已学完，点击取消":"标记为已学",children:i&&(0,t.jsx)("svg",{className:"w-3 h-3",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:(0,t.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:3,d:"M5 13l4 4L19 7"})})}):(0,t.jsx)("span",{className:"w-4 h-4 rounded border border-zinc-300"})}],51462)},86749,e=>{"use strict";function t(e){return Array.isArray?Array.isArray(e):"[object Array]"===d(e)}function s(e){return null==e?"":function(e){if("string"==typeof e)return e;if("bigint"==typeof e)return e.toString();let t=e+"";return"0"==t&&1/e==-1/0?"-0":t}(e)}function i(e){return"string"==typeof e}function r(e){return"number"==typeof e}function n(e){return"object"==typeof e}function a(e){return null!=e}function o(e){return!e.trim().length}function d(e){return null==e?void 0===e?"[object Undefined]":"[object Null]":Object.prototype.toString.call(e)}let l="Invalid doc index: must be a non-negative integer within the bounds of the docs array",c=Object.prototype.hasOwnProperty;class u{constructor(e){this._keys=[],this._keyMap={};let t=0;e.forEach(e=>{let s=p(e);this._keys.push(s),this._keyMap[s.id]=s,t+=s.weight}),this._keys.forEach(e=>{e.weight/=t})}get(e){return this._keyMap[e]}keys(){return this._keys}toJSON(){return JSON.stringify(this._keys)}}function p(e){let s=null,r=null,n=null,a=1,o=null;if(i(e)||t(e))n=e,s=h(e),r=m(e);else{if(!c.call(e,"name"))throw Error("Missing name property in key");let t=e.name;if(n=t,c.call(e,"weight")&&void 0!==e.weight&&(a=e.weight)<=0){let e;throw Error((e=m(t),`Property 'weight' in key '${e}' must be a positive integer`))}s=h(t),r=m(t),o=e.getFn??null}return{path:s,id:r,weight:a,src:n,getFn:o}}function h(e){return t(e)?e:e.split(".")}function m(e){return t(e)?e.join("."):e}let g=Object.freeze({isCaseSensitive:!1,ignoreDiacritics:!1,includeScore:!1,keys:[],shouldSort:!0,sortFn:(e,t)=>e.score===t.score?e.idx<t.idx?-1:1:e.score<t.score?-1:1,includeMatches:!1,findAllMatches:!1,minMatchCharLength:1,location:0,threshold:.6,distance:100,useExtendedSearch:!1,useTokenSearch:!1,tokenize:void 0,tokenMatch:"any",getFn:function(e,o){let l=[],c=!1,u=(e,o,p,h)=>{if(a(e))if(o[p]){var m,g;let f=e[o[p]];if(!a(f))return;if(p===o.length-1&&(i(f)||r(f)||!0===(m=f)||!1===m||n(g=m)&&null!==g&&"[object Boolean]"==d(m)||"bigint"==typeof f))l.push(void 0!==h?{v:s(f),i:h}:s(f));else if(t(f)){c=!0;for(let e=0,t=f.length;e<t;e+=1)u(f[e],o,p+1,e)}else o.length&&u(f,o,p+1,h)}else l.push(void 0!==h?{v:e,i:h}:e)};return u(e,i(o)?o.split("."):o,0),c?l:l[0]},ignoreLocation:!1,ignoreFieldNorm:!1,fieldNormWeight:1});class f{constructor({getFn:e=g.getFn,fieldNormWeight:t=g.fieldNormWeight}={}){this.norm=function(e=1,t=3){let s=new Map,i=Math.pow(10,t);return{get(t){let r=1,n=!1;for(let e=0;e<t.length;e++)32===t.charCodeAt(e)?n||(r++,n=!0):n=!1;if(s.has(r))return s.get(r);let a=Math.round(i/Math.pow(r,.5*e))/i;return s.set(r,a),a},clear(){s.clear()}}}(t,3),this.getFn=e,this.isCreated=!1,this.docs=[],this.keys=[],this._keysMap={},this.setIndexRecords()}setSources(e=[]){this.docs=e}setIndexRecords(e=[]){this.records=e}setKeys(e=[]){this.keys=e,this._keysMap={},e.forEach((e,t)=>{this._keysMap[e.id]=t})}create(){if(this.isCreated||!this.docs.length)return;this.isCreated=!0;let e=this.docs.length;this.records=Array(e);let t=0;if(i(this.docs[0]))for(let s=0;s<e;s++){let e=this._createStringRecord(this.docs[s],s);e&&(this.records[t++]=e)}else for(let s=0;s<e;s++)this.records[t++]=this._createObjectRecord(this.docs[s],s);this.records.length=t,this.norm.clear()}add(e,t){if(!Number.isInteger(t)||t<0)throw Error(l);if(i(e)){let s=this._createStringRecord(e,t);return s&&this.records.push(s),s}let s=this._createObjectRecord(e,t);return this.records.push(s),s}removeAt(e){if(!Number.isInteger(e)||e<0)throw Error(l);for(let t=0,s=this.records.length;t<s;t+=1)if(this.records[t].i===e){this.records.splice(t,1);break}for(let t=0,s=this.records.length;t<s;t+=1)this.records[t].i>e&&(this.records[t].i-=1)}removeAll(e){let t=new Set;for(let s of e)Number.isInteger(s)&&s>=0&&t.add(s);if(0===t.size)return;this.records=this.records.filter(e=>!t.has(e.i));let s=Array.from(t).sort((e,t)=>e-t);for(let e of this.records){let t=0,i=s.length;for(;t<i;){let r=t+i>>>1;s[r]<e.i?t=r+1:i=r}e.i-=t}}getValueForItemAtKeyId(e,t){return e[this._keysMap[t]]}size(){return this.records.length}_createStringRecord(e,t){return!a(e)||o(e)?null:{v:e,i:t,n:this.norm.get(e)}}_createObjectRecord(e,r){let n={i:r,$:{}};for(let r=0,d=this.keys.length;r<d;r++){let d=this.keys[r],l=d.getFn?d.getFn(e):this.getFn(e,d.path);if(a(l)){if(t(l)){let e=[];for(let t=0,r=l.length;t<r;t+=1){let r=l[t];if(a(r)){if(i(r)){if(!o(r)){let s={v:r,i:t,n:this.norm.get(r)};e.push(s)}}else if(a(r.v)){let t=i(r.v)?r.v:s(r.v);if(!o(t)){let s={v:t,i:r.i,n:this.norm.get(t)};e.push(s)}}}}n.$[r]=e}else if(i(l)&&!o(l)){let e={v:l,n:this.norm.get(l)};n.$[r]=e}}}return n}toJSON(){return{keys:this.keys.map(({getFn:e,...t})=>t),records:this.records}}}function A(e,t,{getFn:s=g.getFn,fieldNormWeight:i=g.fieldNormWeight}={}){let r=new f({getFn:s,fieldNormWeight:i});return r.setKeys(e.map(p)),r.setSources(t),r.create(),r}function _(e){if(e.length<=1)return e;e.sort((e,t)=>e[0]-t[0]||e[1]-t[1]);let t=[e[0]];for(let s=1,i=e.length;s<i;s+=1){let i=t[t.length-1],r=e[s];r[0]<=i[1]+1?i[1]=Math.max(i[1],r[1]):t.push(r)}return t}let b={ł:"l",Ł:"L",đ:"d",Đ:"D",ø:"o",Ø:"O",ħ:"h",Ħ:"H",ŧ:"t",Ŧ:"T",ı:"i",ß:"ss"},P=RegExp("["+Object.keys(b).join("")+"]","g"),y="function"==typeof String.prototype.normalize?e=>e.normalize("NFD").replace(/[\u0300-\u036F\u0483-\u0489\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u0711\u0730-\u074A\u07A6-\u07B0\u07EB-\u07F3\u07FD\u0816-\u0819\u081B-\u0823\u0825-\u0827\u0829-\u082D\u0859-\u085B\u08D3-\u08E1\u08E3-\u0903\u093A-\u093C\u093E-\u094F\u0951-\u0957\u0962\u0963\u0981-\u0983\u09BC\u09BE-\u09C4\u09C7\u09C8\u09CB-\u09CD\u09D7\u09E2\u09E3\u09FE\u0A01-\u0A03\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A70\u0A71\u0A75\u0A81-\u0A83\u0ABC\u0ABE-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AE2\u0AE3\u0AFA-\u0AFF\u0B01-\u0B03\u0B3C\u0B3E-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B62\u0B63\u0B82\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD7\u0C00-\u0C04\u0C3E-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C62\u0C63\u0C81-\u0C83\u0CBC\u0CBE-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CE2\u0CE3\u0D00-\u0D03\u0D3B\u0D3C\u0D3E-\u0D44\u0D46-\u0D48\u0D4A-\u0D4D\u0D57\u0D62\u0D63\u0D82\u0D83\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DF2\u0DF3\u0E31\u0E34-\u0E3A\u0E47-\u0E4E\u0EB1\u0EB4-\u0EB9\u0EBB\u0EBC\u0EC8-\u0ECD\u0F18\u0F19\u0F35\u0F37\u0F39\u0F3E\u0F3F\u0F71-\u0F84\u0F86\u0F87\u0F8D-\u0F97\u0F99-\u0FBC\u0FC6\u102B-\u103E\u1056-\u1059\u105E-\u1060\u1062-\u1064\u1067-\u106D\u1071-\u1074\u1082-\u108D\u108F\u109A-\u109D\u135D-\u135F\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17B4-\u17D3\u17DD\u180B-\u180D\u1885\u1886\u18A9\u1920-\u192B\u1930-\u193B\u1A17-\u1A1B\u1A55-\u1A5E\u1A60-\u1A7C\u1A7F\u1AB0-\u1ABE\u1B00-\u1B04\u1B34-\u1B44\u1B6B-\u1B73\u1B80-\u1B82\u1BA1-\u1BAD\u1BE6-\u1BF3\u1C24-\u1C37\u1CD0-\u1CD2\u1CD4-\u1CE8\u1CED\u1CF2-\u1CF4\u1CF7-\u1CF9\u1DC0-\u1DF9\u1DFB-\u1DFF\u20D0-\u20F0\u2CEF-\u2CF1\u2D7F\u2DE0-\u2DFF\u302A-\u302F\u3099\u309A\uA66F-\uA672\uA674-\uA67D\uA69E\uA69F\uA6F0\uA6F1\uA802\uA806\uA80B\uA823-\uA827\uA880\uA881\uA8B4-\uA8C5\uA8E0-\uA8F1\uA8FF\uA926-\uA92D\uA947-\uA953\uA980-\uA983\uA9B3-\uA9C0\uA9E5\uAA29-\uAA36\uAA43\uAA4C\uAA4D\uAA7B-\uAA7D\uAAB0\uAAB2-\uAAB4\uAAB7\uAAB8\uAABE\uAABF\uAAC1\uAAEB-\uAAEF\uAAF5\uAAF6\uABE3-\uABEA\uABEC\uABED\uFB1E\uFE00-\uFE0F\uFE20-\uFE2F]/g,"").replace(P,e=>b[e]):e=>e;class v{constructor(e,{location:t=g.location,threshold:s=g.threshold,distance:i=g.distance,includeMatches:r=g.includeMatches,findAllMatches:n=g.findAllMatches,minMatchCharLength:a=g.minMatchCharLength,isCaseSensitive:o=g.isCaseSensitive,ignoreDiacritics:d=g.ignoreDiacritics,ignoreLocation:l=g.ignoreLocation}={}){if(this.options={location:t,threshold:s,distance:i,includeMatches:r,findAllMatches:n,minMatchCharLength:a,isCaseSensitive:o,ignoreDiacritics:d,ignoreLocation:l},e=o?e:e.toLowerCase(),e=d?y(e):e,this.pattern=e,this.chunks=[],!this.pattern.length)return;const c=(e,t)=>{this.chunks.push({pattern:e,alphabet:function(e){let t={};for(let s=0,i=e.length;s<i;s+=1){let r=e.charAt(s);t[r]=(t[r]||0)|1<<i-s-1}return t}(e),startIndex:t})},u=this.pattern.length;if(u>32){let e=0;const t=u%32,s=u-t;for(;e<s;)c(this.pattern.substr(e,32),e),e+=32;if(t){const e=u-32;c(this.pattern.substr(e),e)}}else c(this.pattern,0)}searchIn(e){let{isCaseSensitive:t,ignoreDiacritics:s,includeMatches:i}=this.options;if(e=t?e:e.toLowerCase(),e=s?y(e):e,this.pattern===e){let t={isMatch:!0,score:0};return i&&(t.indices=[[0,e.length-1]]),t}let{location:r,distance:n,threshold:a,findAllMatches:o,minMatchCharLength:d,ignoreLocation:l}=this.options,c=[],u=0,p=!1;this.chunks.forEach(({pattern:t,alphabet:s,startIndex:h})=>{let{isMatch:m,score:f,indices:A}=function(e,t,s,{location:i=g.location,distance:r=g.distance,threshold:n=g.threshold,findAllMatches:a=g.findAllMatches,minMatchCharLength:o=g.minMatchCharLength,includeMatches:d=g.includeMatches,ignoreLocation:l=g.ignoreLocation}={}){let c;if(t.length>32)throw Error("Pattern length exceeds max of 32.");let u=t.length,p=e.length,h=Math.max(0,Math.min(i,p)),m=n,f=h,A=(e,t)=>{let s=e/u;if(l)return s;let i=Math.abs(h-t);return r?s+i/r:i?1:s},_=o>1||d,b=_?Array(p):[];for(;(c=e.indexOf(t,f))>-1;)if(m=Math.min(A(0,c),m),f=c+u,_){let e=0;for(;e<u;)b[c+e]=1,e+=1}f=-1;let P=[],y=1,v=0,S=u+p,C=1<<u-1;for(let t=0;t<u;t+=1){let i=0,r=S;for(;i<r;)A(t,h+r)<=m?i=r:S=r,r=Math.floor((S-i)/2+i);S=r;let n=Math.max(1,h-r+1),o=a?p:Math.min(h+r,p)+u,d=Array(o+2);d[o+1]=(1<<t)-1;for(let i=o;i>=n;i-=1){let r=i-1,a=s[e[r]];if(d[i]=(d[i+1]<<1|1)&a,t&&(d[i]|=(P[i+1]|P[i])<<1|1|P[i+1]),d[i]&C&&(y=A(t,r))<=m){if(m=y,f=r,v=t,f<=h)break;n=Math.max(1,2*h-f)}}if(A(t+1,h)>m)break;P=d}if(_&&f>=0){let t=Math.min(p-1,f+u-1+v);for(let i=f;i<=t;i+=1)s[e[i]]&&(b[i]=1)}let k={isMatch:f>=0,score:Math.max(.001,y)};if(_){let e=function(e=[],t=g.minMatchCharLength){let s=[],i=-1,r=-1,n=0;for(let a=e.length;n<a;n+=1){let a=e[n];a&&-1===i?i=n:a||-1===i||((r=n-1)-i+1>=t&&s.push([i,r]),i=-1)}return e[n-1]&&n-i>=t&&s.push([i,n-1]),s}(b,o);e.length?d&&(k.indices=e):k.isMatch=!1}return k}(e,t,s,{location:r+h,distance:n,threshold:a,findAllMatches:o,minMatchCharLength:d,includeMatches:i,ignoreLocation:l});m&&(p=!0),u+=f,m&&A&&c.push(...A)});let h={isMatch:p,score:p?u/this.chunks.length:1};return p&&i&&(h.indices=_(c)),h}}let S=new Set(["fuzzy","include"]),C=[{type:"exact",multiRegex:/^="(.*)"$/,singleRegex:/^=(.*)$/,create:e=>({type:"exact",search(t){let s=t===e;return{isMatch:s,score:+!s,indices:[0,e.length-1]}}})},{type:"include",multiRegex:/^'"(.*)"$/,singleRegex:/^'(.*)$/,create:e=>({type:"include",search(t){let s,i=0,r=[],n=e.length;for(;(s=t.indexOf(e,i))>-1;)i=s+n,r.push([s,i-1]);let a=!!r.length;return{isMatch:a,score:+!a,indices:r}}})},{type:"prefix-exact",multiRegex:/^\^"(.*)"$/,singleRegex:/^\^(.*)$/,create:e=>({type:"prefix-exact",search(t){let s=t.startsWith(e);return{isMatch:s,score:+!s,indices:[0,e.length-1]}}})},{type:"inverse-prefix-exact",multiRegex:/^!\^"(.*)"$/,singleRegex:/^!\^(.*)$/,create:e=>({type:"inverse-prefix-exact",search(t){let s=!t.startsWith(e);return{isMatch:s,score:+!s,indices:[0,t.length-1]}}})},{type:"inverse-suffix-exact",multiRegex:/^!"(.*)"\$$/,singleRegex:/^!(.*)\$$/,create:e=>({type:"inverse-suffix-exact",search(t){let s=!t.endsWith(e);return{isMatch:s,score:+!s,indices:[0,t.length-1]}}})},{type:"suffix-exact",multiRegex:/^"(.*)"\$$/,singleRegex:/^(.*)\$$/,create:e=>({type:"suffix-exact",search(t){let s=t.endsWith(e);return{isMatch:s,score:+!s,indices:[t.length-e.length,t.length-1]}}})},{type:"inverse-exact",multiRegex:/^!"(.*)"$/,singleRegex:/^!(.*)$/,create:e=>({type:"inverse-exact",search(t){let s=-1===t.indexOf(e);return{isMatch:s,score:+!s,indices:[0,t.length-1]}}})},{type:"fuzzy",multiRegex:/^"(.*)"$/,singleRegex:/^(.*)$/,create:(e,t={})=>{let s=new v(e,{location:t.location??g.location,threshold:t.threshold??g.threshold,distance:t.distance??g.distance,includeMatches:t.includeMatches??g.includeMatches,findAllMatches:t.findAllMatches??g.findAllMatches,minMatchCharLength:t.minMatchCharLength??g.minMatchCharLength,isCaseSensitive:t.isCaseSensitive??g.isCaseSensitive,ignoreDiacritics:t.ignoreDiacritics??g.ignoreDiacritics,ignoreLocation:t.ignoreLocation??g.ignoreLocation});return{type:"fuzzy",search:e=>s.searchIn(e)}}}],k=C.length;function D(e,t){let s=e.match(t);return s?s[1]:null}let x=[];function E(...e){x.push(...e)}function M(e,t){for(let s=0,i=x.length;s<i;s+=1){let i=x[s];if(i.condition(e,t))return new i(e,t)}return new v(e,t)}let I="$and",F="$path",N=e=>!!(e[I]||e.$or),T=e=>({[I]:Object.keys(e).map(t=>({[t]:e[t]}))});function R(e,s,{auto:r=!0}={}){let a=e=>{if(i(e)){let t={keyId:null,pattern:e};return r&&(t.searcher=M(e,s)),t}let o=Object.keys(e),d=!!e[F];if(!d&&o.length>1&&!N(e))return a(T(e));if(!t(e)&&n(e)&&!N(e)){let t=d?e[F]:o[0],n=d?e.$val:e[t];if(!i(n))throw Error(`Invalid value for key ${t}`);let a={keyId:m(t),pattern:n};return r&&(a.searcher=M(n,s)),a}let l={children:[],operator:o[0]};return o.forEach(s=>{let i=e[s];t(i)&&i.forEach(e=>{l.children.push(a(e))})}),l};return N(e)||(e=T(e)),a(e)}function w(e,{ignoreFieldNorm:t=g.ignoreFieldNorm}){let s=1;return e.forEach(({key:e,norm:i,score:r})=>{let n=e?e.weight:null;s*=Math.pow(0===r&&n?Number.EPSILON:r,(n||1)*(t?1:i))}),s}class B{constructor(e){this.limit=e,this.heap=[]}get size(){return this.heap.length}shouldInsert(e){return this.size<this.limit||e<this.heap[0].score}insert(e){this.size<this.limit?(this.heap.push(e),this._bubbleUp(this.size-1)):e.score<this.heap[0].score&&(this.heap[0]=e,this._sinkDown(0))}extractSorted(e){return this.heap.sort(e)}_bubbleUp(e){let t=this.heap;for(;e>0;){let s=e-1>>1;if(t[e].score<=t[s].score)break;let i=t[e];t[e]=t[s],t[s]=i,e=s}}_sinkDown(e){let t=this.heap,s=t.length,i=e;do{let r=2*(e=i)+1,n=2*e+2;if(r<s&&t[r].score>t[i].score&&(i=r),n<s&&t[n].score>t[i].score&&(i=n),i!==e){let s=t[e];t[e]=t[i],t[i]=s}}while(i!==e)}}let L=/[\p{L}\p{M}\p{N}_]+/gu,O=new WeakSet;function $({isCaseSensitive:e=!1,ignoreDiacritics:t=!1,tokenize:s}={}){let i=function(e){if("function"==typeof e){let t=!1;return s=>{let i=e(s);if(!t&&(t=!0,!Array.isArray(i)||i.some(e=>"string"!=typeof e)))throw Error(`[Fuse] tokenize function must return string[]; received ${Array.isArray(i)?"array containing non-strings":typeof i}.`);return i}}if(e instanceof RegExp)return!e.global&&(O.has(e)||(O.add(e),console.warn(`[Fuse] tokenize regex ${e} lacks the global flag; only the first match per text will be returned. Add the 'g' flag.`))),t=>t.match(e)||[];return e=>e.match(L)||[]}(s);return{tokenize:s=>(e||(s=s.toLowerCase()),t&&(s=y(s)),i(s))}}function V(e,t,s,i){let r=i.tokenize(t);if(!r.length)return;e.fieldCount++,e.docFieldCount.set(s,(e.docFieldCount.get(s)||0)+1);let n=new Set(r),a=e.docTermFieldHits.get(s);for(let t of(a||(a=new Map,e.docTermFieldHits.set(s,a)),n))a.set(t,(a.get(t)||0)+1),e.df.set(t,(e.df.get(t)||0)+1)}function G(e,t,s,i){let{i:r,v:n,$:a}=t;if(void 0!==n)return void V(e,n,r,i);if(a)for(let t=0;t<s;t++){let s=a[t];if(s)if(Array.isArray(s))for(let t of s)V(e,t.v,r,i);else V(e,s.v,r,i)}}function j(e,t){if(0===t.length)return;let s=Array.from(new Set(t)).sort((e,t)=>e-t);for(let t of s)!function(e,t){let s=e.docFieldCount.get(t);if(void 0===s)return;e.fieldCount-=s,e.docFieldCount.delete(t);let i=e.docTermFieldHits.get(t);if(i){for(let[t,s]of i){let i=(e.df.get(t)||0)-s;i<=0?e.df.delete(t):e.df.set(t,i)}e.docTermFieldHits.delete(t)}}(e,t);let i=e=>{let t=0,i=s.length;for(;t<i;){let r=t+i>>>1;s[r]<e?t=r+1:i=r}return e-t},r=s[0],n=new Map;for(let[t,s]of e.docFieldCount)n.set(t>r?i(t):t,s);e.docFieldCount=n;let a=new Map;for(let[t,s]of e.docTermFieldHits)a.set(t>r?i(t):t,s);e.docTermFieldHits=a}class z{constructor(e,t,s){this.options={...g,...t},this.options.useExtendedSearch,this.options.useTokenSearch,this._keyStore=new u(this.options.keys),this._docs=e,this._myIndex=null,this._invertedIndex=null,this.setCollection(e,s),this._lastQuery=null,this._lastSearcher=null}_getSearcher(e){if(this._lastQuery===e)return this._lastSearcher;let t=M(e,this._invertedIndex?{...this.options,_invertedIndex:this._invertedIndex}:this.options);return this._lastQuery=e,this._lastSearcher=t,t}setCollection(e,t){if(this._docs=e,t&&!(t instanceof f))throw Error("Incorrect 'index' type");if(this._myIndex=t||A(this.options.keys,this._docs,{getFn:this.options.getFn,fieldNormWeight:this.options.fieldNormWeight}),this.options.useTokenSearch){let e=$({isCaseSensitive:this.options.isCaseSensitive,ignoreDiacritics:this.options.ignoreDiacritics,tokenize:this.options.tokenize});this._invertedIndex=function(e,t,s){let i={fieldCount:0,df:new Map,docFieldCount:new Map,docTermFieldHits:new Map};for(let r of e)G(i,r,t,s);return i}(this._myIndex.records,this._myIndex.keys.length,e)}this._invalidateSearcherCache()}add(e){if(!a(e))return;this._docs.push(e);let t=this._myIndex.add(e,this._docs.length-1);if(this._invertedIndex&&t){var s;let e=$({isCaseSensitive:this.options.isCaseSensitive,ignoreDiacritics:this.options.ignoreDiacritics,tokenize:this.options.tokenize});s=this._invertedIndex,G(s,t,this._myIndex.keys.length,e)}this._invalidateSearcherCache()}remove(e=()=>!1){let t=[],s=[];for(let i=0,r=this._docs.length;i<r;i+=1)e(this._docs[i],i)&&(t.push(this._docs[i]),s.push(i));if(s.length){this._invertedIndex&&j(this._invertedIndex,s);let e=new Set(s);this._docs=this._docs.filter((t,s)=>!e.has(s)),this._myIndex.removeAll(s),this._invalidateSearcherCache()}return t}removeAt(e){if(!Number.isInteger(e)||e<0||e>=this._docs.length)throw Error(l);this._invertedIndex&&j(this._invertedIndex,[e]);let t=this._docs.splice(e,1)[0];return this._myIndex.removeAt(e),this._invalidateSearcherCache(),t}_invalidateSearcherCache(){this._lastQuery=null,this._lastSearcher=null}getIndex(){return this._myIndex}search(e,t){let s,{limit:n=-1}=t||{},{includeMatches:o,includeScore:d,shouldSort:l,sortFn:c,ignoreFieldNorm:u}=this.options;if(i(e)&&!e.trim()){let e=this._docs.map((e,t)=>({item:e,refIndex:t}));return r(n)&&n>-1&&(e=e.slice(0,n)),e}if(r(n)&&n>0&&i(e)){let t=new B(n);i(this._docs[0])?this._searchStringList(e,{heap:t,ignoreFieldNorm:u}):this._searchObjectList(e,{heap:t,ignoreFieldNorm:u}),s=t.extractSorted(c)}else!function(e,{ignoreFieldNorm:t=g.ignoreFieldNorm}){e.forEach(e=>{e.score=w(e.matches,{ignoreFieldNorm:t})})}(s=i(e)?i(this._docs[0])?this._searchStringList(e):this._searchObjectList(e):this._searchLogical(e),{ignoreFieldNorm:u}),l&&s.sort(c),r(n)&&n>-1&&(s=s.slice(0,n));return function(e,t,{includeMatches:s=g.includeMatches,includeScore:i=g.includeScore}={}){return e.map(e=>{let r,{idx:n}=e,o={item:t[n],refIndex:n};return s&&(r=[],e.matches.forEach(e=>{if(!a(e.indices)||!e.indices.length)return;let t={indices:e.indices,value:e.value};e.key&&(t.key=e.key.id),e.idx>-1&&(t.refIndex=e.idx),r.push(t)}),o.matches=r),i&&(o.score=e.score),o})}(s,this._docs,{includeMatches:o,includeScore:d})}_searchStringList(e,{heap:t,ignoreFieldNorm:s}={}){let i=this._getSearcher(e),r=this.options.useTokenSearch&&"all"===this.options.tokenMatch,{records:n}=this._myIndex,o=t?null:[];return n.forEach(({v:e,i:n,n:d})=>{if(!a(e))return;let l=i.searchIn(e);if(l.isMatch){let i={score:l.score,value:e,norm:d,indices:l.indices};r&&(i.matchedMask=l.matchedMask,i.matchedTerms=l.matchedTerms,i.termCount=l.termCount);let a=[i];if(!r||this._coversAllTokens(a)){let i={item:e,idx:n,matches:a};t?(i.score=w(i.matches,{ignoreFieldNorm:s}),t.shouldInsert(i.score)&&t.insert(i)):o.push(i)}}}),o}_searchLogical(e){let t=R(e,this.options),s=(e,t,i)=>{if(!("children"in e)){let s,{keyId:r,searcher:n}=e;return(null===r?(s=[],this._myIndex.keys.forEach((e,i)=>{s.push(...this._findMatches({key:e,value:t[i],searcher:n}))})):s=this._findMatches({key:this._keyStore.get(r),value:this._myIndex.getValueForItemAtKeyId(t,r),searcher:n}),s&&s.length)?[{idx:i,item:t,matches:s}]:[]}let{children:r,operator:n}=e,a=[];for(let e=0,o=r.length;e<o;e+=1){let o=s(r[e],t,i);if(o.length)a.push(...o);else if(n===I)return[]}return a},i=this._myIndex.records,r=new Map,n=[];return i.forEach(({$:e,i:i})=>{if(a(e)){let a=s(t,e,i);a.length&&(r.has(i)||(r.set(i,{idx:i,item:e,matches:[]}),n.push(r.get(i))),a.forEach(({matches:e})=>{r.get(i).matches.push(...e)}))}}),n}_searchObjectList(e,{heap:t,ignoreFieldNorm:s}={}){let i=this._getSearcher(e),r=this.options.useTokenSearch&&"all"===this.options.tokenMatch,{keys:n,records:o}=this._myIndex,d=t?null:[];return o.forEach(({$:e,i:o})=>{if(!a(e))return;let l=[],c=!1,u=!1;if(n.forEach((t,s)=>{let r=this._findMatches({key:t,value:e[s],searcher:i});r.length?(l.push(...r),r[0].hasInverse&&(u=!0)):c=!0}),(!u||!c)&&l.length&&(!r||this._coversAllTokens(l))){let i={idx:o,item:e,matches:l};t?(i.score=w(i.matches,{ignoreFieldNorm:s}),t.shouldInsert(i.score)&&t.insert(i)):d.push(i)}}),d}_findMatches({key:e,value:s,searcher:i}){if(!a(s))return[];let r=[];if(t(s))s.forEach(({v:t,i:s,n:n})=>{if(!a(t))return;let o=i.searchIn(t);if(o.isMatch){let i={score:o.score,key:e,value:t,idx:s,norm:n,indices:o.indices,hasInverse:o.hasInverse};void 0!==o.termCount&&(i.matchedMask=o.matchedMask,i.matchedTerms=o.matchedTerms,i.termCount=o.termCount),r.push(i)}});else{let{v:t,n:n}=s,a=i.searchIn(t);if(a.isMatch){let s={score:a.score,key:e,value:t,norm:n,indices:a.indices,hasInverse:a.hasInverse};void 0!==a.termCount&&(s.matchedMask=a.matchedMask,s.matchedTerms=a.matchedTerms,s.termCount=a.termCount),r.push(s)}}return r}_coversAllTokens(e){let t=e.length?e[0].termCount:void 0;if(void 0===t)return!0;if(t<=31){let s=0;for(let t=0;t<e.length;t++)s|=e[t].matchedMask||0;return s===2**t-1}let s=new Set;for(let t=0;t<e.length;t++){let i=e[t].matchedTerms;if(i)for(let e of i)s.add(e)}return s.size===t}}z.version="7.4.1",z.createIndex=A,z.parseIndex=function(e,{getFn:t=g.getFn,fieldNormWeight:s=g.fieldNormWeight}={}){let{keys:i,records:r}=e,n=new f({getFn:t,fieldNormWeight:s});return n.setKeys(i),n.setIndexRecords(r),n},z.config=g,z.match=function(e,t,s){if(s&&s.useTokenSearch)throw Error("Fuse.match does not support useTokenSearch: token search requires corpus-level statistics (df, fieldCount) that a one-off string comparison does not have. Use new Fuse(...).search(...) instead.");return M(e,{...g,...s}).searchIn(t)},z.parseQuery=R,E(class{constructor(e,{isCaseSensitive:t=g.isCaseSensitive,ignoreDiacritics:s=g.ignoreDiacritics,includeMatches:i=g.includeMatches,minMatchCharLength:r=g.minMatchCharLength,ignoreLocation:n=g.ignoreLocation,findAllMatches:a=g.findAllMatches,location:o=g.location,threshold:d=g.threshold,distance:l=g.distance}={}){this.query=null,this.options={isCaseSensitive:t,ignoreDiacritics:s,includeMatches:i,minMatchCharLength:r,findAllMatches:a,ignoreLocation:n,location:o,threshold:d,distance:l},e=t?e:e.toLowerCase(),e=s?y(e):e,this.pattern=e,this.query=function(e,t={}){return e.replace(/\\\|/g,"\0").split("|").map(e=>{let s=(function(e){let t=[],s=e.length,i=0;for(;i<s;){for(;i<s&&" "===e[i];)i++;if(i>=s)break;let r=i;for(;r<s&&" "!==e[r]&&'"'!==e[r];)r++;if(r<s&&'"'===e[r]){for(r++;r<s;){if('"'===e[r]){let t=r+1;if(t>=s||" "===e[t]){r++;break}if("$"===e[t]&&(t+1>=s||" "===e[t+1])){r+=2;break}}r++}t.push(e.substring(i,r)),i=r}else{for(;r<s&&" "!==e[r];)r++;t.push(e.substring(i,r)),i=r}}return t})(e.replace(/\u0000/g,"|").trim()).filter(e=>e&&!!e.trim()),i=[];for(let e=0,r=s.length;e<r;e+=1){let r=s[e],n=!1,a=-1;for(;!n&&++a<k;){let e=C[a],s=D(r,e.multiRegex);s&&(i.push(e.create(s,t)),n=!0)}if(!n)for(a=-1;++a<k;){let e=C[a],s=D(r,e.singleRegex);if(s){i.push(e.create(s,t));break}}}return i})}(this.pattern,this.options)}static condition(e,t){return t.useExtendedSearch}searchIn(e){let t=this.query;if(!t)return{isMatch:!1,score:1};let{includeMatches:s,isCaseSensitive:i,ignoreDiacritics:r}=this.options;e=i?e:e.toLowerCase(),e=r?y(e):e;let n=0,a=[],o=0,d=!1;for(let i=0,r=t.length;i<r;i+=1){let r=t[i];a.length=0,n=0,d=!1;for(let t=0,i=r.length;t<i;t+=1){let i=r[t],{isMatch:l,indices:c,score:u}=i.search(e);if(l)n+=1,o+=u,i.type.startsWith("inverse")&&(d=!0),s&&(S.has(i.type)?a.push(...c):a.push(c));else{o=0,n=0,a.length=0,d=!1;break}}if(n){let e={isMatch:!0,score:o/n};return d&&(e.hasInverse=!0),s&&(e.indices=_(a)),e}}return{isMatch:!1,score:1}}}),E(class{static condition(e,t){return t.useTokenSearch}constructor(e,t){this.options=t,this.analyzer=$({isCaseSensitive:t.isCaseSensitive,ignoreDiacritics:t.ignoreDiacritics,tokenize:t.tokenize});const s=this.analyzer.tokenize(e),{df:i,fieldCount:r}=t._invertedIndex;for(const e of(this.termSearchers=[],this.idfWeights=[],s)){this.termSearchers.push(new v(e,{location:t.location,threshold:t.threshold,distance:t.distance,includeMatches:t.includeMatches,findAllMatches:t.findAllMatches,minMatchCharLength:t.minMatchCharLength,isCaseSensitive:t.isCaseSensitive,ignoreDiacritics:t.ignoreDiacritics,ignoreLocation:!0}));const s=i.get(e)||0,n=Math.log(1+(r-s+.5)/(s+.5));this.idfWeights.push(n)}this.combineAll="all"===t.tokenMatch,this.numTerms=this.termSearchers.length,this.useMask=this.numTerms<=31}searchIn(e){if(!this.termSearchers.length)return{isMatch:!1,score:1};let t=[],s=0,i=0,r=0,n=0,a=this.combineAll&&!this.useMask?new Set:null;for(let o=0;o<this.termSearchers.length;o++){let d=this.termSearchers[o].searchIn(e),l=this.idfWeights[o];i+=l,d.isMatch&&(r++,s+=l*(1-d.score),d.indices&&t.push(...d.indices),this.combineAll&&(this.useMask?n|=1<<o:a.add(o)))}if(0===r)return{isMatch:!1,score:1};let o={isMatch:!0,score:Math.max(.001,i>0?1-s/i:0)};return this.options.includeMatches&&t.length&&(o.indices=_(t)),this.combineAll&&(this.useMask?o.matchedMask=n:o.matchedTerms=a,o.termCount=this.numTerms),o}}),z.use=function(...e){e.forEach(e=>E(e))};let K=null,U=[];e.s(["buildSearchIndex",0,function(e){U=e,K=new z(e,{keys:[{name:"title",weight:2},{name:"content",weight:1},{name:"category",weight:.5},{name:"tags",weight:1.5}],threshold:.4,distance:100,includeScore:!0,minMatchCharLength:1})},"search",0,function(e,t=10){return K&&e.trim()?K.search(e.trim()).slice(0,t).map(e=>e.item):U.slice(0,t)}],86749)}]);