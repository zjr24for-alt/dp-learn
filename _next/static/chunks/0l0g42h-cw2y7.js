(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,94757,95228,e=>{"use strict";let t=[{slug:"dpgen-workflow-overview",title:"DP 势函数生成完整流程",category:"dpgen-workflow",summary:"DP 势函数生成五阶段完整流程（建模→DFT参数→初始数据集→主动学习循环→收敛判定），含数据集扩充方向约束难点标注与标准目录模板",content:`# DP 势函数生成完整流程

## 总流程概览

MLP 开发主线（主动学习闭环）：

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

完整流程分为五个阶段：**建模 → DFT 参数确定 → 初始数据集 → 主动学习循环 → 收敛判定**。

---

## 一、建模阶段

- **原始晶体结构**：CIF 文件（ICSD / Materials Project 等数据库获取，清洗无序占位、修正晶格参数）
- **结构拓展**：ATAT 工具
  - 构建超胞、固溶体组分、基础缺陷（空位、间隙、置换原子）初始构型
- **输出**：一批干净的 POSCAR 初始结构文件

## 二、DFT 计算参数确定

依据相关文献选定统一计算参数：泛函、赝势、截断能、k 点网格、收敛阈值、自旋 / 范德华修正、U 值等。

> ⚠️ **硬性规则**：全流程 DFT 参数禁止中途变更。

## 三、构建初始数据集（DPGEN）

执行 \`dpgen init_bulk\`：仅生成完美块体晶格均匀拉伸、剪切形变构型，完成 DFT 标注，构成初代数据集。

> ⚠️ **局限**：仅覆盖平衡态完整晶体，缺少缺陷、高温、非平衡、冲击 / 碰撞构型。

### init_bulk + 不同温度探索是否可行？

✅ **完全可行，也是标准操作。** 只用 \`dpgen init_bulk\` 生成 0K 近平衡均匀形变晶体初始数据集，后续 \`dpgen run\` 主动学习探索阶段设置任意目标温度（室温、高温、辐照高温、熔融温度）。

**关键区分**：
- **init_bulk**：没有温度概念，全部是静态 0K 晶格形变构型（均匀伸缩、剪切），只做 DFT 静态单点计算
- **dpgen run / explore**：DP-MD 在设定的有限温度下开展动力学采样，通过 NVT/NPT 控温引入热扰动

> ⚠️ **冷启动问题**：初始数据集全是 0K 近平衡完美晶体，DP 势初期只学习平衡晶格附近信息。第一轮 explore 直接设极高温度（接近熔化/辐照局部高温），DP 势外推能力极差，极易出现原子飞散、结构爆炸、筛选大量物理无效构型浪费 DFT 算力。

**推荐实操策略（辐照模拟场景）**：
1. 第 1 轮主动学习：较低温度区间，先采样温和热畸变构型
2. 后续迭代：逐步抬升 MD 温度，慢慢向目标高温/极端工况靠近
3. 目标工况含瞬时极高能量畸变（级联碰撞）：人工补充缺陷构型 / AIMD 瞬态构型加入初始集，缓解冷启动外推难题

**常见疑问**：初始集全是 0K 数据，能描述高温体系吗？
数据集本身不含温度信息，只存储「结构-能量-力」映射。高温对应的是原子高度畸变的结构——只要主动学习通过高温 MD 不断采集高温畸变构型并标注 DFT，模型就能逐步学到高温区域。

### 渐进升温配置示例

\`param.json\` 中 \`model_devi_jobs\` 按轮次逐步升温，第一轮保守、后续轮次逐步逼近目标温度：

\`\`\`json
{
  "model_devi_jobs": [
    {
      "sys_idx": [0],
      "temps": [300, 600, 1000],
      "press": [1, 1, 1],
      "trj_freq": 10,
      "nsteps": 3000,
      "ensemble": "nvt"
    },
    {
      "sys_idx": [0],
      "temps": [600, 1000, 1500],
      "press": [1, 1, 1],
      "trj_freq": 10,
      "nsteps": 5000,
      "ensemble": "nvt"
    },
    {
      "sys_idx": [0],
      "temps": [1000, 1500, 2000],
      "press": [1, 1, 1],
      "trj_freq": 10,
      "nsteps": 10000,
      "ensemble": "npt",
      "taop": 0.5
    }
  ]
}
\`\`\`

> **原理**：每一轮对应 \`model_devi_jobs\` 的一个条目（第 iter_index 轮用第 index 个 job）。第 0 轮从温和温度起步，第 1 轮扩展到中高温，第 2 轮进入目标高温区并切换 NPT 允许体积涨落。温度跨度控制在 2-3 倍以内，避免模型外推崩溃。

## 四、主动学习循环（核心）

1. 训练 DP 集成模型（4 模型标准配置）
2. Explore 采样（LAMMPS 基于 DP 势动力学探索）
3. 不确定性筛选高置信度待标注构型
4. DFT 单点计算，扩充数据集
5. 数据并入训练集，进入下一轮迭代

### ✅ 重点难点：数据集扩充方向约束

**核心原则**：不存在通用万能势，主动学习不能盲目大范围随机采样；扩充构型空间要有明确边界，由后续模拟场景决定。

| 目标用途 | 扩充方向 | 采样取舍 |
|------|---------|---------|
| 常温静态缺陷扩散 | 空位、间隙子、缺陷迁移过渡态、低应变构型 | 无需大量高温熔融、极端冲击结构 |
| 辐照级联碰撞模拟 | 高温、大原子位移、高密度缺陷、局部熔融、高能碰撞瞬态构型 | 单纯平衡晶体采样完全不足 |
| 固溶体力学形变 | 不同组分、塑性剪切、位错相关构型 | — |

> 🚫 **常见踩坑**：无目标漫无目的地放开 MD 温度、扰动幅度，生成大量和研究工况无关构型。不仅浪费 DFT 算力，还会导致模型在关注的关键区域精度不足。

### 配套操作

每一轮迭代，针对性修改 \`dpgen explore\` 模块配置（温度区间、初始构型、扰动幅度、压强、缺陷初始结构），对齐既定扩充方向。

## 五、收敛判定

- 独立测试集能量、力 RMSE 达标
- 连续多轮新增待标注构型显著减少
- → 势函数收敛，输出 \`*.dp\` 势文件

---

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
`,tags:["dpgen","model_devi","candidate","信任度","调参"],sourceFiles:["dpgen常用检查指令.txt"]}],a=[{slug:"deepmd-training-params",title:"DeePMD 训练参数详解",category:"deepmd-training",summary:"TiC MLP 项目的完整训练参数配置（descriptor、fitting_net、学习率、batch_size 等）",content:`# DeePMD 训练参数详解

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
from pathlib import Path

# ── 收集所有 OUTCAR ──────────────────────────────────────────────
# DP-GEN 每轮 FP 标注后，task 目录下会有 OUTCAR 文件
systems = []
failed_tasks = []  # 记录失败的 task

for task_dir in sorted(Path("iter.000000/02.fp").glob("task.*")):
    outcar = task_dir / "OUTCAR"
    if not outcar.exists():
        failed_tasks.append(task_dir.name)
        continue

    try:
        # fmt="vasp/outcar" 告诉 dpdata 按 VASP OUTCAR 格式解析
        # 解析内容：能量(eV)、力(eV/\xc5)、应力(kB)
        s = dpdata.LabeledSystem(str(outcar), fmt="vasp/outcar")
        if len(s) > 0:  # 确保有有效帧
            systems.append(s)
        else:
            failed_tasks.append(task_dir.name)
    except Exception as e:
        # OUTCAR 不完整（VASP 崩溃/超时）时会解析失败
        print(f"跳过 {task_dir.name}: {e}")
        failed_tasks.append(task_dir.name)

print(f"成功: {len(systems)} 个 task, 失败: {len(failed_tasks)} 个")

# ── 合并并保存 ───────────────────────────────────────────────────
# dpdata 用 append() 做帧级拼接（不是数组级拼接）
merged = systems[0]
for s in systems[1:]:
    merged.append(s)

# to_deepmd_npy() 生成 DeePMD 训练所需的 numpy 文件
# 输出目录结构：
#   set.001/
#   ├── box.npy      # 晶胞向量 (n_frames, 9)
#   ├── coord.npy    # 原子坐标 (n_frames, n_atoms*3)
#   ├── energy.npy   # 总能量 (n_frames,)
#   ├── force.npy    # 原子力 (n_frames, n_atoms*3)
#   └── virial.npy   # 应力张量 (n_frames, 9)
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
`,tags:["deepmd","数据回流","OUTCAR","dpdata","训练集"],sourceFiles:["工作流程以及模版文件夹.md"]}],n=[{slug:"vasp-pbs-templates",title:"VASP PBS 任务模板（独立任务 + 批量FP）",category:"vasp-hpc",summary:"两个万能 PBS 模板：独立单任务和 DP-GEN 批量 FP，含所有占位符替换清单",content:`# VASP PBS 任务模板

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
`,tags:["VASP","FP","检查","PBS","提交前"],sourceFiles:["手动fp.txt"]}],o=[{slug:"env-config-overview",title:"环境配置总览（本地 + 超算）",category:"env-config",summary:"TiC MLP 项目的完整环境配置，本地 WSL2 Ubuntu + 超算服务器的路径、Conda 环境、软件版本对照",content:`# 环境配置总览

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
`,tags:["conda","环境","版本管理","最佳实践"],sourceFiles:["环境配置备忘录.md"]}],s=[{slug:"grep-find-cheatsheet",title:"grep 和 find 用法速查",category:"linux-tips",summary:"最常用的文件内容搜索和文件名查找命令合集，含 ripgrep 和 pdfgrep",content:'# grep 和 find 用法速查\n\n## 一、在文件内容中查找关键词\n\n| 场景 | 命令 | 说明 |\n|------|------|------|\n| 在单个文件中搜索 | `grep "关键词" 文件名` | 最基础用法 |\n| 忽略大小写 | `grep -i "关键词" 文件名` | Error 匹配 error |\n| 显示行号 | `grep -n "关键词" 文件名` | 方便定位 |\n| 递归搜索整个目录 | `grep -r "关键词" 目录/` | 搜索所有子目录 |\n| 只列出文件名 | `grep -l "关键词" *.txt` | 不显示匹配内容 |\n| 极速搜索 | `rg "关键词"` | ripgrep：默认递归、自动忽略 .gitignore |\n| 面向代码搜索 | `ag "关键词"` 或 `ack "关键词"` | 跳过备份文件、二进制文件 |\n| 搜索 PDF | `pdfgrep "关键词" 文档.pdf` | 需安装 pdfgrep |\n| 搜索 Word | 先转文本再 grep | `libreoffice --headless --convert-to txt 文档.docx` |\n\n## 二、按文件名称查找文件\n\n| 场景 | 命令 | 说明 |\n|------|------|------|\n| 精确查找 | `find /路径 -name "文件名"` | 递归查找 |\n| 通配符模糊查找 | `find . -name "*.conf"` | 所有 .conf 结尾 |\n| 忽略大小写 | `find . -iname "readme.txt"` | 匹配 README.txt 等 |\n| 只查找普通文件 | `find . -type f -name "*.log"` | -type f 排除目录 |\n| 查找并搜索内容 | `find . -name "*.html" -exec grep -l "关键词" {} \\;` | 组合使用 |\n',tags:["linux","grep","find","搜索","ripgrep"],sourceFiles:["grep和find的用法.md"]},{slug:"tar-cheatsheet",title:"tar 打包解压速查",category:"linux-tips",summary:"tar 最常用命令：创建/解压/查看 .tar/.tar.gz/.tar.bz2/.tar.xz",content:`# tar 打包解压速查

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
`,tags:["linux","tar","压缩","解压"],sourceFiles:["tar速查.txt"]}],i=[{slug:"simulation-learning-framework",title:"计算模拟实战学习法",category:"methodology",summary:"一套以「复现文献」为唯一目标、「按需学习」为核心的计算模拟学习方法论",content:`# 计算模拟实战学习法

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
`,tags:["声子","Phonopy","热力学","有限位移","晶格动力学","自由能"],sourceFiles:["phonon-thermodynamics.md"]},{slug:"defect-formation-energy",title:"DFT 缺陷形成能计算（vacancy / interstitial / 带电缺陷）",category:"comp-materials",summary:"点缺陷形成能完整计算流程：超胞构建、化学势取法、带电缺陷修正（Freysoldt），以及与机器学习势的对比要点",content:`# DFT 缺陷形成能计算

## 核心公式

\`\`\`text
ΔE_f = E_def − E_perfect + Σ n_i\xb7μ_i + q(E_VBM + ε_F) + E_corr
\`\`\`

各项含义：
- **E_def / E_perfect**：含缺陷超胞与完美超胞的总能
- **n_i**：缺陷源的移除/添加原子数（n_i > 0 表示移除原子）
- **μ_i**：缺陷源的化学势（取稳定相平衡下的值）
- **q**：电荷态（0 表示中性缺陷）
- **E_VBM**：完美晶体的价带顶
- **ε_F**：费米能级（取 0 到带隙之间扫描）
- **E_corr**：有限尺寸修正（带电缺陷时不可忽略）

## 完整计算流程

### 1. 构建足够大的超胞

\`\`\`text
要求：≥ 2\xd72\xd72，通常 64~128 原子
原因：抑制周期性镜像作用，否则缺陷间相互作用污染形成能
判断：继续扩胞看形成能是否收敛（变化 < 0.05 eV 即可）
\`\`\`

### 2. 同参数优化完美与含缺陷超胞

- **完全一致的参数**：ENCUT、KPOINTS、POTCAR、ISMEAR 必须相同
- 只优化原子位置，晶胞形状固定（保持体积接近完美晶体）
- 带电缺陷：用 \`NELECT\` 加减电子数实现电荷态

### 3. 化学势取法（最关键也最容易错）

\`\`\`text
二元体系 AB：
  μ_A ≤ μ_A(bulk)          （元素不能比单质更富）
  μ_A + μ_B = μ_AB(bulk)   （稳定化合物条件）

富 A 端点：μ_A = μ_A(bulk)，μ_B = μ_AB(bulk) − μ_A(bulk)
富 B 端点：μ_B = μ_B(bulk)，μ_A = μ_AB(bulk) − μ_B(bulk)
\`\`\`

**要点**：分别取富 A / 富 B 两个端点，绘制缺陷相图（形成能 vs 化学势），而不是只算一个点。

### 4. 带电缺陷修正

带电缺陷因周期性镜像引入长程库仑作用，需要修正：

| 方法 | 工具 | 适用 |
|------|------|------|
| Freysoldt 修正（DFT） | sxdefectalign | 带电缺陷，推荐 |
| 经验修正（Makov-Payne） | 手算 | 粗略估算 |
| 增大超胞 | 重新计算 | 最稳妥但最贵 |

### 5. 相图绘制

\`\`\`text
横轴：费米能级 ε_F（0 → E_g）
纵轴：形成能 ΔE_f
每条线：一个缺陷在某个电荷态下的形成能
稳定区：形成能最低的电荷态/缺陷类型
\`\`\`

## 与机器学习势（deepmd）对比的要点

1. **超胞尺寸与 k 点完全一致**，否则误差不可比
2. deepmd 势的缺陷形成能应落在 DFT 参考值 0.1 eV 量级内
3. 缺陷结构需要先充分弛豫——未弛豫的缺陷形成能偏高
4. 对深能级缺陷，比较多个电荷态的形成能曲线，而非只看中性

## 常见坑

| 问题 | 解决 |
|------|------|
| 形成能不收敛 | 超胞不够大，或弛豫不充分 |
| 富 A/富 B 端点结果差异大 | 正常，画出相图看两端 |
| 带电缺陷 E_corr 很大 | 必须做 Freysoldt 修正，经验修正常不够 |
| 与实验不符 | 检查化学势是否对应稳定相（考虑相图区间） |
`,tags:["缺陷","形成能","DFT","VASP","Freysoldt","化学势"],sourceFiles:["defect-formation-energy.md"]},{slug:"neb-migration-barrier",title:"NEB / CI-NEB 迁移能垒计算",category:"comp-materials",summary:"用 NEB/CI-NEB 计算原子迁移能垒：初末态准备、image 插值、VTST VASP 或 LAMMPS neb 执行、收敛判据与鞍点确认",content:`# NEB / CI-NEB 迁移能垒计算

## 什么场景用 NEB

| 场景 | 说明 |
|------|------|
| 原子扩散 / 迁移 | 杂质、间隙原子、空位跳跃 |
| 表面反应 | 吸附物迁移、脱附 |
| 位错运动 / 相变 | 大尺度构型转变 |
| **与 ML 势对比** | 验证 deepmd 势的迁移能垒精度 |

NEB（Nudged Elastic Band）找**最小能量路径（MEP）**上的鞍点，给出迁移能垒 E_a。

## 完整工作流

### 1. 优化初态与末态

\`\`\`text
要求：
- 初态：迁移前最稳定结构（含缺陷/杂质的超胞）
- 末态：迁移后最稳定结构
- 都用高精度参数优化到力收敛
\`\`\`

### 2. 线性插值生成初始路径

\`\`\`python
# ASE 线性插值：初态→末态之间生成 N-2 个 image
from ase.neb import NEB
from ase.io import read, write
from ase.optimize import BFGS

initial = read('initial.vasp')
final   = read('final.vasp')

images = [initial.copy() for _ in range(7)]  # 7 个 image（含端点）
images[-1] = final
neb = NEB(images, climb=True, k=0.5)  # climb=True = CI-NEB
neb.interpolate()  # 线性插值初始路径

for img in images:
    write(f'img_{images.index(img)}.vasp', img)
\`\`\`

**image 数量**：通常 7~11 个（含端点 2 个 + 中间 5~9 个）。太少路径粗糙，太多每个都要算。

### 3. 执行 NEB 计算

**VTST 版 VASP（推荐，能垒精度高）：**

\`\`\`incar
# INCAR 关键项
ICHAIN = 0        # NEB 方法
LCLIMB = .TRUE.   # CI-NEB（找鞍点）
IMAGES = 5        # 中间 image 数（需编译带 VTST 的 VASP）
SPRING = -5.0     # 弹性常数
LNEBCELL = .FALSE.
EDIFFG = -0.02    # 力收敛判据
IBRION = 1        # 需要 NEB 专用优化器
ISYM = 0          # NEB 关闭对称性
\`\`\`

**LAMMPS neb 命令（deepmd 势可选）：**

\`\`\`lammps
# 用 LAMMPS 的 neb 命令（VASP 之外的另一条路）
# 初始路径由多个 data 文件给出，配合 fix neb 使用
\`\`\`

### 4. 收敛判据

\`\`\`text
- 切向力 < 0.02 eV/\xc5
- 能量收敛
- 同时满足 → 提取能垒
\`\`\`

### 5. 提取鞍点能垒

\`\`\`bash
# VTST 工具：提取 MEP 数据
nebmake.pl  # 或 nebresults.pl
# 输出 MEP 能量曲线 → 最高点能量 − 初态能量 = 迁移能垒 E_a
\`\`\`

### 6. 鞍点确认（关键一步）

\`\`\`text
确认鞍点是真正的过渡态：
- 对鞍点结构做频率计算
- 必须且仅有一个虚频（虚频方向对应迁移方向）
- 如果多个虚频或没有虚频 → 结构不是鞍点，需调整
\`\`\`

## 与 ML 势（deepmd）对比的要点

1. 用同一初态/末态和同一 image 数跑 deepmd 势的 NEB
2. 能垒误差应在 0.1 eV 量级内（与 DFT 端态/鞍点对比）
3. deepmd 势可以做更长路径、更大超胞的 NEB——这是它的优势
4. 注意 deepmd 势的鞍点位置可能与 DFT 略有偏移，需重新确认虚频

## 常见坑

| 问题 | 解决 |
|------|------|
| 路径初始插值不合理（原子穿模） | 用 IDPP 插值（\`neb.interpolate(method='idpp')\`） |
| 收敛慢 | 减小 image 间距离，或用 CI-NEB 加快 |
| 找不到虚频 | 结构停在鞍点附近但不是鞍点，重新优化 |
| 多个虚频 | 路径偏移了真实 MEP，用爬坡方法（\`climb\`）重找 |
| 端点能量不一致 | 端点必须各自充分弛豫 |
`,tags:["NEB","CI-NEB","迁移能垒","过渡态","VTST","扩散"],sourceFiles:["neb-migration-barrier.md"]}],r=[{slug:"md-fundamentals",title:"分子动力学模拟基础与实战要点",category:"atomistic-sim",summary:"Verlet 积分、系综选择、thermostat/barostat 原理、timestep 选择、平衡判断，从零理解 MD 核心概念",content:`# 分子动力学模拟基础与实战要点

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
`,tags:["Phonopy","phono3py","晶格动力学","声子寿命","热导率","RTA"],sourceFiles:["phonopy-phono3py-workflow.md"]},{slug:"atat-sqs-high-entropy-alloy",title:"高熵合金建模：ATAT · SQS 特殊准随机结构",category:"atomistic-sim",summary:"高熵合金/无序固溶体用 ATAT 的 mcsqs 生成特殊准随机结构（SQS），重点讲为什么用 SQS、mcsqs 完整流程与关联函数收敛判断",content:`# 高熵合金建模：ATAT \xb7 SQS 特殊准随机结构

## 什么时候需要 SQS

| 体系 | 建模方式 |
|------|---------|
| 纯元素 / 有序化合物（TiC 等） | CIF + ASE 直接建胞即可 |
| **高熵合金 / 无序固溶体** | **ATAT mcsqs 生成 SQS 超胞** |
| 有序中间相 / 间隙固溶体 | 由晶格+占位规则手工构造 |

> 核心判断：体系是否存在**化学无序**（多种元素随机占位）。只要占位无序，就需要 SQS 而不是简单替位超胞。

## 为什么用 SQS 而不是随机替位

随机替位的小超胞往往能量和短程有序不具代表性——**几十个原子的超胞里，随机抽样的原子排布方差很大**。SQS 的目标不是能量最低，而是让超胞里的**短程关联函数（pair/multi-body correlation）最接近理想随机固溶体**，这样小超胞也能代表宏观合金。

\`\`\`text
SQS 优化目标：
  匹配 pair 关联 Γ₂(R)，进而匹配多体关联 Γ₃、Γ₄...
  在给定超胞尺寸下，把关联函数误差压到目标（通常 ≤ 1e-3 量级）
\`\`\`

## mcsqs 完整流程

\`\`\`bash
# 1. 准备：先把目标成分写成随机占位的初始超胞（VASP/ASE 格式）
#    示例 32 原子，截断半径 10 \xc5
mcsqs -n 32 -rc 10.0

# 2. 迭代优化（核心），直到关联函数误差达目标
#    - 目标成分在 clust 文件中定义（mcsqs 默认读 clusters.out）
#    - 输出 sqs.out：最优结构的 POSCAR 格式
mcsqs  # 可在同一目录继续运行以延长优化

# 3. 检查关联函数匹配质量
corrdump -rnd -c > sqs_pair.out
# 对比目标关联函数，重点看前几个近邻壳层的 pair 项

# 4. 转成 VASP 用的 POSCAR
cell2vasp < sqs.out > POSCAR

# 5. 核对：原子数、化学计量比、晶格常数
\`\`\`

## mcsqs 关键参数

| 参数 | 含义 | 推荐 |
|------|------|------|
| \`-n\` | 超胞原子数 | 32~64（越大关联函数越好匹配，计算越贵） |
| \`-rc\` | 截断半径 (\xc5) | ≥ 10 \xc5，覆盖第一二近邻壳层 |
| \`-ip\` | 每次交换的原子对数 | 默认 1，可增大加快收敛 |
| \`-sig\` | 随机种子 | 固定后可复现 |

## 收敛判断：关联函数误差

\`\`\`text
目标：corrdump 输出的 pair 关联函数与理想随机值误差 ≤ 1e-3 量级
理想随机 pair 关联 Γ₂(理想) 由成分直接算：Γ₂ = Σ c_i\xb2 - 1   （A-B 二元）
\`\`\`

判断要点：
1. **前几个近邻壳层**（第一、第二、第三 NN）的 pair 关联要准——它们决定短程有序和大多数物理性质
2. 远壳层（> 10 \xc5）误差可容忍，因为长程关联影响小
3. 多体关联（Γ₃、Γ₄）在高熵合金中也需要，但优先保证 pair 匹配

## 常见坑

| 问题 | 解决 |
|------|------|
| mcsqs 长时间不收敛 | 增大 \`-n\` 或 \`-ip\`，或从多个随机种子重跑取最优 |
| sqs.out 不是 POSCAR 格式 | 用 cell2vasp 或 atomsk 转换 |
| 关联函数对不上目标成分 | 检查 clusters.out 里成分设置是否正确 |
| SQS 结构能量偏高 | 正常——SQS 是"最随机的结构"不是"能量最低的结构" |
| 命令随 ATAT 版本略有差异 | 以你安装的 ATAT 版本 \`mcsqs -h\` 为准 |

## 与后续 DP-GEN 流程衔接

- SQS 产出的 POSCAR 直接作为 \`sys_configs\`（init_bulk 的 from_poscar_path 或探索的初始结构）
- 高熵合金的 \`type_map\` 元素多，记得核对 \`mass_map\` 和 \`fp_pp_files\` 顺序一一对应
- 原子数较大的 SQS 超胞，MD 探索会偏贵——可用 \`super_cell: [1,1,1]\` 直接跑，不必再扩胞
`,tags:["ATAT","SQS","高熵合金","无序固溶体","建模","mcsqs"],sourceFiles:["atat-sqs-high-entropy-alloy.md"]}],d=[{slug:"ovito-basics",title:"OVITO 基础操作与数据导入",category:"ovito-tips",summary:"OVITO Pro GUI 界面、Pipeline 编辑器、LAMMPS/POSCAR/XYZ 格式导入、视图操作与基础可视化",content:`# OVITO 基础操作与数据导入

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
`,tags:["OVITO","Python","批处理","Tachyon","渲染","自定义modifier","HPC"],sourceFiles:["ovito-python-scripting.md"]}],m=[{slug:"dpgen-practical-guidelines",title:"DP-GEN 实战指南：从参数配置到收敛判断",category:"dpgen-workflow",summary:"DP-GEN 主动学习的核心概念、参数设置策略、模型偏差解读与收敛判断（来源：deepmodeling/tutorials）",tags:["dpgen","主动学习","模型偏差","收敛"],sourceFiles:["deepmodeling/tutorials"],content:`# DP-GEN 实战指南

## 核心思想

DP-GEN 做一件事：**用最少的 DFT 计算训练出覆盖最广构型空间的势函数**。它通过主动学习闭环实现：

> 当前模型 → MD 探索未知构型 → 模型不确定的构型挑出来 → DFT 重算 → 加入训练集 → 下一轮

## 构型空间与采样

### 为什么需要主动学习
- DFT 计算昂贵（一个 100 原子体系可能耗费数百核时）
- 分子动力学轨迹只覆盖相空间极小一部分
- 手工挑选训练构型依赖经验，容易遗漏关键区域

### DP-GEN 的解决方案
- **exploration**：用 committee model（4 个模型独立训练）做 MD，模型间分歧大的构型 = 模型不确定
- **labeling**：只对不确定构型做 DFT 标注
- **training**：新数据加入训练集，模型能力提升

## 参数设置策略

### model_devi 关键参数

| 参数 | 推荐值 | 说明 |
|------|--------|------|
| model_devi_f_trust_lo | 0.05 ~ 0.15 eV/\xc5 | 低于此值认为模型可靠，跳过标注 |
| model_devi_f_trust_hi | 0.30 ~ 0.50 eV/\xc5 | 高于此值认为模型完全不靠谱，直接丢弃（避免标注浪费） |
| model_devi_e_trust_lo | 0.01 ~ 0.05 eV | 能量偏差下界 |
| model_devi_e_trust_hi | 0.20 ~ 0.50 eV | 能量偏差上界 |
| model_devi_numb_models | 4 | committee 模型数，通常 4（不同随机种子） |
| model_devi_dt_freq | 10 | 每多少 MD 步计算一次偏差（越大越快但可能漏掉快过程） |

> **调参口诀**：trust_lo 控"漏选"（太低 → 标注太多），trust_hi 控"误选"（太高 → 标注质量差）。先用默认值跑一轮，看 candidate 比例再微调。

### 如何判断参数合理

1. **candidate 比例**：每轮 model_devi 筛选后，trust_lo < deviation < trust_hi 的构型占总探索构型的 **5% ~ 20%** 是健康范围
   - \`< 5%\`：模型已经很好，或 trust_lo 太低
   - \`> 30%\`：模型不够好，或 trust_hi 太高，标注负担太重
2. **收敛标志**：连续 2-3 轮 candidate 比例下降且模型偏差不再降低
3. **final model 测试**：在独立测试集上的 energy RMSE < 1 meV/atom，force RMSE < 0.1 eV/\xc5

### 训练参数建议

| 参数 | 初训 | 增量训练 | 说明 |
|------|------|---------|------|
| numb_steps | 400k ~ 800k | 200k ~ 400k | 初期需要更多步数学习基础 |
| start_lr | 1e-3 | 5e-4 | 增量训练从更低学习率起步（避免破坏已学好的权重） |
| decay_steps | 2000 ~ 5000 | 2000 | 指数衰减，越大学习率下降越慢 |
| stop_batch | 400k | 400k | 总步数与 numb_steps 对齐 |

> **初训 vs 增量训练**：第一轮数据少但需要学广，步数多、学习率高；后续轮次数据增量加入，步数可减少、学习率降低以精细调整。

## 常见问题排查

### 1. model_devi.out 中 deviation 全是 0
- 检查 committee model 是否用了不同随机种子初始化
- 确认 \`numb_models\` > 1
- 所有模型可能坍塌到同一局部最优

### 2. candidate 比例始终 < 1%
- trust_lo 设得太高，尝试降到 0.02
- 初始训练数据已经覆盖得很好 → 试着提高温度拓宽 MD 探索范围
- 体系本身太简单（如纯金属 fcc），考虑直接训练

### 3. 迭代不收敛
- 增加每轮的 MD 步数（nsteps）
- 提高 MD 温度使探索更广泛
- 检查 VASP 计算是否正常（OUTCAR 能量合理）
- 考虑添加结构扰动生成更多初始构型`},{slug:"dpgen-param-json-reference",title:"DP-GEN param.json 关键参数速查",category:"dpgen-workflow",summary:"param.json 中 model_devi、fp、training 块的核心参数含义与推荐值",tags:["dpgen","param.json","参数配置","VASP"],sourceFiles:["deepmodeling/dpgen"],content:`# DP-GEN param.json 关键参数速查

## type_map
\`\`\`json
"type_map": ["Ti", "C"]
\`\`\`
- 元素列表，决定 training data 中原子类型的编码顺序
- **AI 提示**：type_map 顺序影响 DeePMD 训练时 type.raw 的映射，保持一致！(来源: DP-GEN 文档)

## model_devi 块

\`\`\`json
"model_devi_f_trust_lo": 0.10,  // 力偏差下界 (eV/\xc5)，低于此值：准确，跳过
"model_devi_f_trust_hi": 0.40,  // 力偏差上界 (eV/\xc5)，高于此值：不准，丢弃
"model_devi_e_trust_lo": 0.02,  // 能量偏差下界 (eV)
"model_devi_e_trust_hi": 0.20,  // 能量偏差上界 (eV)
"model_devi_numb_models": 4,    // committee 模型数，通常 4
"model_devi_dt_freq": 10        // 每多少 MD 步计算一次偏差
\`\`\`

## fp (First-Principles) 块

\`\`\`json
"fp_style": "vasp",
"fp_task_max": 200,      // 单轮最大 VASP 任务数
"fp_task_min": 5,        // 单轮最小 VASP 任务数（低于此数终止迭代）
"fp_incar": "INCAR_fp",  // VASP INCAR 模板路径
"fp_pp_path": "./",      // 赝势目录
"fp_pp_files": ["POTCAR_Ti", "POTCAR_C"]
\`\`\`

- **AI 提示**：fp_task_max 控制每轮 DFT 成本，200 是经验安全值(来源: DP-GEN 实战教程)

## INCAR 模板要点

\`\`\`text
ISIF   = 2      # 只优化原子位置，不改变晶胞
ISMEAR = 0      # 半导体/绝缘体用 Gaussian smearing
SIGMA  = 0.05   # smearing 宽度
ENCUT  = 520    # 截断能 (eV)，至少为 POTCAR ENMAX 的 1.3 倍
EDIFF  = 1E-6   # 电子收敛标准
EDIFFG = -0.02  # 离子弛豫力收敛标准 (eV/\xc5)
\`\`\`

- **AI 注意**：ENCUT 一定要设对！TiC 体系建议 ≥ 520 eV (来源: VASP 文档)
- **AI 注意**：ISIF = 2 是 DP-GEN 最常用设置，因为只关心原子位置不关心晶胞变化 (来源: DP-GEN 实战)`}],l=[{slug:"deepmd-quick-start",title:"DeePMD 快速上手：从数据到势函数",category:"deepmd-training",summary:"训练一个 DP 势函数的完整流程：数据准备 → 训练 → 冻结 → 测试 → LAMMPS 推理（20 分钟上手）",tags:["deepmd","训练","冻结","LAMMPS"],sourceFiles:["deepmodeling/deepmd-kit/doc/getting-started"],content:`# DeePMD 快速上手

## 完整流程

\`\`\`text
准备数据 (dpdata)
    ↓
训练 (dp train input.json)
    ↓
冻结 (dp freeze -o frozen_model.pb)
    ↓
测试 (dp test -m frozen_model.pb)
    ↓
LAMMPS 推理 (pair_style deepmd)
\`\`\`

## 1. 数据准备

使用 dpdata 从 VASP 输出提取训练数据：

\`\`\`python
import dpdata
import numpy as np

# ── 读取 VASP 输出 ──────────────────────────────────────────────
# fmt="vasp/outcar" 显式指定格式；也可省略，dpdata 会自动识别
system = dpdata.LabeledSystem("OUTCAR", fmt="vasp/outcar")

# 查看基本信息（调试用）
print(f"原子数: {system.get_natoms()}")       # 如 216
print(f"元素种类: {system.get_atom_names()}")  # 如 ['Ti', 'C']
print(f"帧数: {len(system)}")                  # 如 100
print(f"原子类型编码: {system.get_atom_types()}")  # 如 [0,0,...,1,1,...]

# ── 导出为 DeePMD 训练格式 ───────────────────────────────────────
# to_deepmd_npy() 生成 set.000/ 目录，包含：
#   type_map.raw  — 元素映射 ["Ti", "C"]
#   type.raw      — 每个原子的类型编码
#   set.000/box.npy      — 晶胞向量 (n_frames, 9)
#   set.000/coord.npy    — 原子坐标 (n_frames, n_atoms*3)
#   set.000/energy.npy   — 总能量 (n_frames,)
#   set.000/force.npy    — 原子力 (n_frames, n_atoms*3)
#   set.000/virial.npy   — 应力张量 (n_frames, 9)
system.to_deepmd_npy("training_data/")

# ── 数据质量检查 ─────────────────────────────────────────────────
# 检查力分布，排除异常帧（力 > 50 eV/\xc5 通常表示结构有问题）
forces = system.data["forces"]  # shape: (n_frames, n_atoms, 3)
force_max = np.abs(forces).max()
print(f"最大力: {force_max:.2f} eV/\xc5")
if force_max > 50:
    print("⚠️ 存在异常大的力，建议检查结构是否合理")
\`\`\`

也可以从 vasprun.xml 读取（更稳定，推荐大数据量）：
\`\`\`python
# vasprun.xml 结构化更好，解析更可靠
system = dpdata.LabeledSystem("vasprun.xml", fmt="vasp/xml")
\`\`\`

## 2. 训练配置 (input.json)

\`\`\`json
{
  "model": {
    "type_map": ["Ti", "C"],
    "descriptor": {
      "type": "se_e2_a",
      "sel": [40, 40],
      "rcut_smth": 5.0,
      "rcut": 6.5,
      "neuron": [25, 50, 100],
      "axis_neuron": 16,
      "seed": 1
    },
    "fitting_net": {
      "neuron": [240, 240, 240],
      "resnet_dt": true,
      "seed": 1
    }
  },
  "learning_rate": {
    "type": "exp",
    "start_lr": 0.001,
    "decay_steps": 5000,
    "stop_lr": 3.3e-8
  },
  "loss": {
    "start_pref_e": 0.02,
    "limit_pref_e": 1,
    "start_pref_f": 1000,
    "limit_pref_f": 1,
    "start_pref_v": 0,
    "limit_pref_v": 0
  },
  "training": {
    "numb_steps": 400000,
    "seed": 1,
    "disp_file": "lcurve.out",
    "save_freq": 1000
  }
}
\`\`\`

### 关键参数解释

| 参数 | 含义 | 调参建议 |
|------|------|---------|
| sel | 每种原子的最大近邻数 | 需大于体系中实际近邻数，否则截断报错；看体系中径向分布函数(RDF)第一峰位置外的原子数 |
| rcut | 截断半径 (\xc5) | 太大会增加计算量，太小会丢失近邻信息；通常 6-8 \xc5 (来源: DeePMD 文档) |
| neuron (fitting) | 拟合网络结构 | [240,240,240] 适合多数体系；更复杂体系可加到 [480,480,480] |
| start_pref_f | 力损失的初始权重 | 1000（重视力）是默认值，力比能量更敏感 |
| seed | 随机种子 | committee model 各模型需不同 seed |

## 3. 训练

\`\`\`bash
# ── TensorFlow 后端（默认，v2.x 时代主流） ──
dp train input.json

# ── PyTorch 后端（v3.x 推荐，性能更好） ──
dp --pt train input.json

# ── 多 GPU 训练 (PyTorch 后端) ──
# --num-nodes: 节点数
# --node-rank: 当前节点编号（0 为主节点）
dp --pt train input.json --num-nodes 1 --node-rank 0

# ── 从 checkpoint 恢复训练（中断后续跑） ──
dp train input.json --restart model.ckpt.pt
\`\`\`

查看训练曲线：
\`\`\`bash
# lcurve.out 格式：step  lr  loss_e  loss_f  loss_v
# loss_e: 能量损失，loss_f: 力损失，loss_v: virial 损失
# 正常情况下 loss_f 应逐步下降（力是主要学习目标）
tail -5 lcurve.out
\`\`\`

训练状态判断：
- loss_f 持续下降 → 正常训练
- loss_f 震荡不降 → 学习率太大，尝试降低 start_lr
- loss_f 突然跳高 → 数据有问题，检查异常帧

## 4. 冻结模型

\`\`\`bash
dp freeze -o frozen_model.pb
\`\`\`
- 冻结将 checkpoint 转为推理用的 .pb 文件
- 同时生成压缩模型备选（更小更快，但精度略有损失）

## 5. 测试

\`\`\`bash
dp test -m frozen_model.pb -s test_data/ -n 100
\`\`\`
输出示例：
\`\`\`text
Energy RMSE: 0.0008 eV/atom
Force  RMSE: 0.0460 eV/\xc5
\`\`\`

**通过标准**（适合大多数材料体系）：
- Energy RMSE < 0.001 eV/atom
- Force RMSE < 0.10 eV/\xc5

## 6. LAMMPS 推理

\`\`\`bash
# in.lammps
pair_style deepmd frozen_model.pb
pair_coeff * *
\`\`\`

LAMMPS 中的注意事项：
- \`pair_style deepmd\` 自动处理跨种类原子对
- 模型路径必须正确，建议用绝对路径
- 首次运行会加载模型到 GPU 显存，注意显存容量`}],c=[{slug:"lammps-deepmd-integration",title:"LAMMPS + DeePMD 集成：配置、运行与排错",category:"deepmd-training",summary:"在 LAMMPS 中使用 DP 势函数的完整配置、常见报错排查和性能优化技巧",tags:["LAMMPS","DeePMD","pair_style","势函数","MD"],sourceFiles:["deepmodeling/deepmd-kit","lammps.org"],content:`# LAMMPS + DeePMD 集成

## 配置

### 编译带 DeePMD 支持的 LAMMPS

\`\`\`bash
# 方式 1: Conda（推荐）
conda install -c conda-forge lammps

# 方式 2: 源码编译
cd lammps/src
make yes-user-deepmd
make mpi -j$(nproc)
\`\`\`

### 输入文件模板

\`\`\`text
# in.deform
units           metal          # DeePMD 输出 eV, \xc5, fs，必须用 metal!
atom_style      atomic
boundary        p p p

read_data       POSCAR.lmp     # 从 VASP POSCAR 转换

pair_style      deepmd frozen_model.pb
pair_coeff      * *

thermo_style    custom step temp pe ke etotal press vol
thermo          100

# NPT 示例
fix             1 all npt temp 300 300 0.1 iso 1.0 1.0 1.0
timestep        0.0005         # 0.5 fs（metal units 下为 ps）
run             100000
\`\`\`

### units 对照表（metal vs real）

| 物理量 | metal unit | real unit |
|--------|-----------|-----------|
| 长度 | \xc5 | \xc5 |
| 能量 | eV | kcal/mol |
| 时间 | ps | fs |
| 压强 | bar | atm |
| 力 | eV/\xc5 | kcal/(mol\xb7\xc5) |

**关键**：DeePMD 模型输出的是 eV 和 \xc5，所以 LAMMPS 必须用 \`units metal\`！

## 常见报错排错

### 1. "Illegal pair_style deepmd command"
- **原因**：LAMMPS 未编译 USER-DEEPMD 包
- **解决**：重新编译 \`make yes-user-deepmd && make mpi\`
- 或用 conda 安装：\`conda install -c conda-forge lammps\`

### 2. "Segmentation fault (core dumped)" 在模型加载时
- **原因 A**：TensorFlow/PyTorch 版本与编译 LAMMPS 时不一致
- **原因 B**：模型文件路径错误或 .pb 文件损坏
- **排查**：先用 \`dp test -m frozen_model.pb\` 确认模型可用
- **排查**：检查 OMP_NUM_THREADS 设置是否合理

### 3. "Number of atom types mismatch"
- **原因**：LAMMPS 原子类型数与 DeePMD 模型的 type_map 数量不一致
- **解决**：检查 type_map 和 LAMMPS data 文件中 atom types 的对应关系

### 4. 能量/力突然爆炸（nan 或 inf）
- **原因 A**：原子距离过近（< 1 \xc5），导致力无限大
- **原因 B**：模拟温度过高，原子进入模型从未见过的构型空间
- **原因 C**：timestep 太大导致原子飞移
- **解决**：降低 timestep（0.5 fs → 0.25 fs）、降低温度、增加训练数据中高温构型

### 5. "KPOINTS float bug"（VASP 相关，DP-GEN 标注阶段）
- **原因**：K 点文件格式错误或路径不对
- **解决**：检查 KPOINTS 文件、POTCAR 路径、赝势版本一致性(来源: VASP wiki)

## 性能优化

| 优化项 | 方法 | 提升 |
|--------|------|------|
| 模型压缩 | \`dp compress -i frozen_model.pb -o compressed.pb\` | 2-4x 加速 |
| 平滑截断 | rcut_smth 设得略小于 rcut | 避免边界不连续 |
| GPU 推理 | 使用 GPU 版本的 LAMMPS + DeePMD | 10-50x 加速 |
| sel 优化 | 根据实际近邻数调整 sel，不要过大 | 减少内存和计算 |
| 大批量 MD | 多个独立 trajectory 并行跑 | 线性加速 |`}],_=[{slug:"dpdata-overview",title:"dpdata 全能数据转换：从 VASP/Gaussian 到 DeePMD 格式",category:"deepmd-training",summary:"dpdata 支持的输入/输出格式、LabeledSystem 用法、数据合并与切分、多格式互转的完整指南",tags:["dpdata","数据转换","LabeledSystem","deepmd","格式"],sourceFiles:["deepmodeling/dpdata"],content:`# dpdata 全能数据转换指南

dpdata 是 DeepModeling 生态的数据处理枢纽，负责在各种 DFT/MD 输出格式与 DeePMD 训练格式之间做转换。

## 核心概念

\`\`\`text
┌─────────────┐     dpdata      ┌──────────────┐
│ DFT 输出     │ ──────────────→ │ DeePMD 训练   │
│ OUTCAR/xml   │   LabeledSystem │ set.xxx/     │
│ log/xyz/...  │                 │ coord.npy    │
└─────────────┘                 │ energy.npy   │
                                │ force.npy    │
                                └──────────────┘
\`\`\`

两个核心类：
- **System**: 只有坐标和晶胞（无标签），用于结构操作
- **LabeledSystem**: 坐标 + 能量 + 力 + 应力（有标签），用于训练数据

## 安装

\`\`\`bash
# conda 安装（推荐）
conda install -c conda.deepmodeling dpdata

# pip 安装
pip install dpdata
\`\`\`

## 支持的输入格式

| 格式标识 | 来源软件 | 读取文件 | 说明 |
|---------|---------|---------|------|
| vasp/outcar | VASP | OUTCAR | 最常用，含能量/力/应力 |
| vasp/xml | VASP | vasprun.xml | 更结构化，推荐大数据量 |
| vasp/poscar | VASP | POSCAR | 只有结构，无标签 |
| deepmd/npy | DeePMD | set.xxx/ | DeePMD 原生 numpy 格式 |
| deepmd/raw | DeePMD | set.xxx/ | DeePMD 原生文本格式 |
| gaussian/log | Gaussian | .log | 高斯输出 |
| gaussian/md | Gaussian | .log | 高斯 MD 轨迹 |
| cp2k/output | CP2K | output | CP2K 输出 |
| pwscf/input | Quantum ESPRESSO | .in | QE 输入 |
| pwscf/output | Quantum ESPRESSO | .out | QE 输出 |
| siesta/output | SIESTA | .out | SIESTA 输出 |
|quip/gap/xyz | QUIP/GAP | .xyz | GAP 势函数训练数据 |

## 基本用法

### 1. 读取 VASP 数据

\`\`\`python
import dpdata

# 从 OUTCAR 读取（最常用）
# fmt 指定格式，dpdata 会自动解析 OUTCAR 中的能量、力、应力
system = dpdata.LabeledSystem("OUTCAR", fmt="vasp/outcar")

# 从 vasprun.xml 读取（更稳定，推荐大数据量）
system = dpdata.LabeledSystem("vasprun.xml", fmt="vasp/xml")

# 自动检测格式（省略 fmt）
system = dpdata.LabeledSystem("OUTCAR")  # dpdata 自动识别

# 查看基本信息
print(f"原子数: {system.get_natoms()}")       # 如 64
print(f"元素种类: {system.get_atom_names()}")  # 如 ['Ti', 'C']
print(f"帧数: {len(system)}")                  # 如 100
print(f"原子类型: {system.get_atom_types()}")   # 如 [0,0,...,1,1,...]
\`\`\`

### 2. 导出为 DeePMD 训练格式

\`\`\`python
# 导出为 npy 格式（推荐，速度快）
# 生成目录结构：
# training_data/
# ├── type_map.raw    # 元素映射 ["Ti", "C"]
# ├── type.raw        # 每个原子的类型编码 [0,0,...,1,1,...]
# └── set.000/
#     ├── box.npy      # 晶胞 (n_frames, 9)
#     ├── coord.npy    # 坐标 (n_frames, n_atoms*3)
#     ├── energy.npy   # 能量 (n_frames,)
#     ├── force.npy    # 力 (n_frames, n_atoms*3)
#     └── virial.npy   # 应力 (n_frames, 9)
system.to_deepmd_npy("training_data/")

# 导出为 raw 格式（文本，便于检查）
system.to_deepmd_raw("training_data_raw/")
\`\`\`

### 3. 数据合并（DP-GEN 数据回流核心操作）

\`\`\`python
import dpdata
from pathlib import Path

# 场景：收集 DP-GEN 一轮 FP 标注的所有 OUTCAR，合并为训练集
systems = []
for task_dir in sorted(Path("iter.000000/02.fp").glob("task.*")):
    outcar = task_dir / "OUTCAR"
    if outcar.exists() and outcar.stat().st_size > 0:
        try:
            # 读取单个 task 的 OUTCAR
            s = dpdata.LabeledSystem(str(outcar), fmt="vasp/outcar")
            if len(s) > 0:  # 确保有有效帧
                systems.append(s)
        except Exception as e:
            print(f"跳过 {task_dir}: {e}")  # OUTCAR 不完整时跳过

if not systems:
    raise ValueError("没有找到有效的 OUTCAR 文件！")

# 合并所有系统（dpdata 用 append 做拼接）
merged = systems[0]
for s in systems[1:]:
    merged.append(s)

print(f"合并完成: {len(merged)} 帧, {merged.get_natoms()} 原子")

# 导出
merged.to_deepmd_npy("new_training_data/")
\`\`\`

### 4. 格式互转

\`\`\`python
# OUTCAR → POSCAR（提取结构）
system = dpdata.System("OUTCAR", fmt="vasp/outcar")
system.to_vasp_poscar("CONTCAR_extracted")

# DeePMD npy → POSCAR
system = dpdata.System("training_data/", fmt="deepmd/npy")
system.to_vasp_poscar("from_deepmd.vasp")

# OUTCAR → LAMMPS data
system.to_lammps_lmp("data.lammps")

# LAMMPS dump → DeePMD
system = dpdata.System("dump.lammpstrj", fmt="lammps/dump")
\`\`\`

## 进阶用法

### 数据切分（训练集/测试集分离）

\`\`\`python
import numpy as np

system = dpdata.LabeledSystem("OUTCAR", fmt="vasp/outcar")
n_frames = len(system)

# 随机打乱并切分 80/20
indices = np.random.permutation(n_frames)
n_train = int(0.8 * n_frames)

train_idx = sorted(indices[:n_train])
test_idx = sorted(indices[n_train:])

# 切分
train_system = system.sub_system(train_idx)
test_system = system.sub_system(test_idx)

train_system.to_deepmd_npy("train/")
test_system.to_deepmd_npy("test/")
\`\`\`

### 多目录批量读取

\`\`\`python
import dpdata
from pathlib import Path

# 批量读取多个 AIMD 轨迹
all_systems = dpdata.LabeledSystem()
for outcar in Path("aimd_runs/").glob("*/OUTCAR"):
    s = dpdata.LabeledSystem(str(outcar))
    all_systems.append(s)

print(f"总计: {len(all_systems)} 帧")
all_systems.to_deepmd_npy("aimd_training_data/")
\`\`\`

### 深度等价（Deep Equivalent）数据处理

\`\`\`python
# 用 dpdata 的 shift_energy 调整能量参考
# 不同 DFT 计算的能量参考不一致时需要对齐
system = dpdata.LabeledSystem("OUTCAR")
# system.data["energies"] += shift_value  # 手动偏移
\`\`\`

## 常见问题

### 1. "No valid data found in OUTCAR"
- OUTCAR 不完整（VASP 未正常结束）
- 检查 OUTCAR 末尾是否有 "Voluntary context switches" 行
- 解决：用 try-except 包裹读取，跳过坏文件

### 2. virial.npy 缺失
- 旧版 VASP 的 OUTCAR 可能不含 stress 信息
- 检查 OUTCAR 中是否有 "in kB" 行
- 解决：在 INCAR 中确保 ISIF ≥ 2

### 3. type_map 不一致
- 合并多个数据源时，type_map 必须完全一致
- TiC 体系：type_map = ["Ti", "C"]，顺序固定
- 解决：检查每个 set.xxx 的 type_map.raw

### 4. 内存不足
- 大量 AIMD 轨迹可能几百 GB
- 解决：分批读取并导出，或使用 dpdata 的 lazy 模式
`},{slug:"dpdata-dpgen-integration",title:"dpdata 在 DP-GEN 工作流中的实战应用",category:"dpgen-workflow",summary:"dpdata 在 DP-GEN 主动学习各阶段的具体用法：初始化数据、数据回流、数据质量检查",tags:["dpdata","dpgen","数据回流","初始化","主动学习"],sourceFiles:["deepmodeling/dpdata","deepmodeling/dpgen"],content:`# dpdata 在 DP-GEN 工作流中的实战应用

## 在 DP-GEN 各阶段的角色

\`\`\`text
阶段 1: 初始化 ──→ dpdata 生成 init_data/set.000/
阶段 2: 训练   ──→ DeePMD 直接读取 set.xxx/ (dpdata 格式)
阶段 3: 探索   ──→ LAMMPS 输出 dump (dpdata 可读)
阶段 4: 标注   ──→ VASP 输出 OUTCAR (dpdata 读取)
阶段 5: 回流   ──→ dpdata 合并 OUTCAR → set.xxx/
阶段 6: 再训练 ──→ init_data + 所有 set.xxx/ 合并训练
\`\`\`

## 阶段 1：初始化数据准备

从 AIMD 轨迹提取初始训练集：

\`\`\`python
import dpdata
from pathlib import Path

# 从多个 AIMD 目录收集数据
# 每个目录代表一个温度/压力条件下的 AIMD 轨迹
init_systems = []
for aimd_dir in sorted(Path("aimd_runs").glob("*")):
    outcar = aimd_dir / "OUTCAR"
    if outcar.exists():
        s = dpdata.LabeledSystem(str(outcar), fmt="vasp/outcar")
        # 每 N 帧取一帧（降采样，避免相邻帧高度相似）
        step = max(1, len(s) // 50)  # 每个轨迹取约 50 帧
        s_sub = s.sub_system(list(range(0, len(s), step)))
        init_systems.append(s_sub)
        print(f"{aimd_dir.name}: {len(s)} → {len(s_sub)} 帧")

# 合并
merged = init_systems[0]
for s in init_systems[1:]:
    merged.append(s)

# 导出到 dpgen 的 init_data 目录
merged.to_deepmd_npy("dpgen/init_data/set.000/")
print(f"初始化数据: {len(merged)} 帧")
\`\`\`

## 阶段 5：数据回流（最关键）

每轮 DP-GEN 迭代后，收集标注数据并合并到训练集：

\`\`\`python
import dpdata
from pathlib import Path

def collect_fp_data(iter_index, fp_base="02.fp"):
    """收集一轮迭代中所有成功标注的 OUTCAR"""
    iter_dir = Path(f"iter.{iter_index:06d}")
    fp_dir = iter_dir / fp_base

    systems = []
    failed = 0

    for task_dir in sorted(fp_dir.glob("task.*")):
        outcar = task_dir / "OUTCAR"
        if not outcar.exists():
            failed += 1
            continue

        try:
            s = dpdata.LabeledSystem(str(outcar), fmt="vasp/outcar")
            if len(s) > 0:
                systems.append(s)
            else:
                failed += 1
        except Exception as e:
            print(f"  跳过 {task_dir.name}: {e}")
            failed += 1

    if systems:
        merged = systems[0]
        for s in systems[1:]:
            merged.append(s)
        return merged, failed
    return None, failed

# 收集并保存
data, n_failed = collect_fp_data(0)
if data:
    data.to_deepmd_npy("iter.000000/02.fp/data_deepmd/")
    print(f"标注数据: {len(data)} 帧, 失败 {n_failed} 个 task")
\`\`\`

## 阶段 6：训练数据合并

每轮训练前，合并初始数据 + 所有已回流数据：

\`\`\`python
import dpdata

# 加载初始数据
all_data = dpdata.LabeledSystem("dpgen/init_data/set.000/", fmt="deepmd/npy")

# 逐轮合并新标注数据
for i in range(current_iter):
    new_data_path = f"iter.{i:06d}/02.fp/data_deepmd/"
    try:
        new_data = dpdata.LabeledSystem(new_data_path, fmt="deepmd/npy")
        all_data.append(new_data)
        print(f"轮次 {i}: +{len(new_data)} 帧, 累计 {len(all_data)} 帧")
    except FileNotFoundError:
        print(f"轮次 {i}: 无数据")

# 导出合并后的训练集
all_data.to_deepmd_npy("merged_training_data/")
\`\`\`

## 数据质量检查

\`\`\`python
import dpdata
import numpy as np

system = dpdata.LabeledSystem("training_data/", fmt="deepmd/npy")

# 检查能量分布
energies = system.data["energies"]  # shape: (n_frames,)
print(f"能量范围: {energies.min():.3f} ~ {energies.max():.3f} eV")
print(f"能量均值: {energies.mean():.3f} eV")
print(f"能量标准差: {energies.std():.3f} eV")

# 检查力的分布
forces = system.data["forces"]  # shape: (n_frames, n_atoms, 3)
force_magnitudes = np.linalg.norm(forces, axis=2)
print(f"力范围: {force_magnitudes.min():.3f} ~ {force_magnitudes.max():.3f} eV/\xc5")
print(f"力均值: {force_magnitudes.mean():.3f} eV/\xc5")

# 检查异常帧（力 > 50 eV/\xc5 通常表示结构有问题）
bad_frames = np.where(force_magnitudes.max(axis=1) > 50)[0]
if len(bad_frames) > 0:
    print(f"⚠️ 发现 {len(bad_frames)} 帧力异常大，请检查结构")
    print(f"  异常帧索引: {bad_frames.tolist()}")
\`\`\`
`}],u=[{slug:"net-size-tuning",title:"网络大小调优：fitting_net 与 embedding_net 的精度-速度权衡",category:"deepmd-training",summary:"基于官方 benchmark 数据，不同 fitting_net/embedding_net 大小对 Al₂O₃、Cu、H₂O 体系精度的影响",tags:["deepmd","网络大小","fitting_net","embedding_net","调优","benchmark"],sourceFiles:["deepmodeling/deepmd-kit/doc/troubleshooting/howtoset_netsize.md"],content:`# 网络大小调优指南

## 核心结论

1. **fitting_net 对精度影响较小**：从 [240,240,240] 缩小到 [20,20,20]，力 RMSE 仅增加 2-5%
2. **embedding_net 对精度影响很大**：从 [25,50,100] 缩小到 [4,8,16]，力 RMSE 可能增加 50-100%
3. **推荐策略**：embedding_net 不要太小，fitting_net 可以适当缩小以节省计算

## 官方 Benchmark 数据

### Al₂O₃ 体系（embedding_net: [25,50,100]）

| fitting_net | 能量 RMSE (eV/atom) | 力 RMSE (eV/\xc5) |
|-------------|---------------------|-----------------|
| [240,240,240] | 7.26e-05 | 0.040 |
| [80,80,80] | 7.50e-05 | 0.040 |
| [20,20,20] | 7.64e-05 | 0.041 |
| [10,10,10] | 7.97e-05 | 0.042 |
| [5,5,5] | 8.05e-05 | 0.042 |
| [] (线性) | 1.31e-04 | 0.054 |

> **解读**：fitting_net 从 [240,240,240] 缩到 [20,20,20]，力 RMSE 仅从 0.040 增到 0.041 eV/\xc5，几乎无差别。但去掉隐藏层（线性回归）精度显著下降。

### Al₂O₃ 体系（fitting_net: [240,240,240]）

| embedding_net | 能量 RMSE (eV/atom) | 力 RMSE (eV/\xc5) |
|---------------|---------------------|-----------------|
| [25,50,100] | 7.26e-05 | 0.040 |
| [10,20,40] | 1.21e-04 | 0.047 |
| [5,10,20] | 1.40e-04 | 0.057 |
| [4,8,16] | 2.53e-04 | 0.073 |
| [2,4,8] | 2.20e-04 | 0.075 |
| [1,2,4] | 5.43e-04 | 0.097 |

> **解读**：embedding_net 从 [25,50,100] 缩到 [4,8,16]，力 RMSE 从 0.040 增到 0.073 eV/\xc5，增加 82%！embedding_net 是精度的关键。

### Cu 体系

| fitting_net | 力 RMSE (eV/\xc5) | embedding_net | 力 RMSE (eV/\xc5) |
|-------------|----------------|---------------|----------------|
| [240,240,240] | 0.089 | [25,50,100] | 0.089 |
| [20,20,20] | 0.090 | [10,20,40] | 0.090 |
| [10,10,10] | 0.090 | [5,10,20] | 0.090 |
| [] (线性) | 0.090 | [4,8,16] | 0.095 |

> **解读**：Cu 体系 fitting_net 几乎无影响（变化 <1%），但 embedding_net 缩小到 [4,8,16] 时精度开始明显下降。

### H₂O 体系

| fitting_net | 力 RMSE (eV/\xc5) | embedding_net | 力 RMSE (eV/\xc5) |
|-------------|----------------|---------------|----------------|
| [240,240,240] | 0.052 | [25,50,100] | 0.052 |
| [80,80,80] | 0.053 | [10,20,40] | 0.063 |
| [20,20,20] | 0.058 | [5,10,20] | 0.073 |
| [10,10,10] | 0.062 | [4,8,16] | 0.080 |

## 实用调参策略

### 快速筛选（大体系 / 有限计算资源）
\`\`\`json
"fitting_net": { "neuron": [20, 20, 20] },
"descriptor": { "neuron": [10, 20, 40] }
\`\`\`

### 标准精度（大多数场景）
\`\`\`json
"fitting_net": { "neuron": [120, 120, 120] },
"descriptor": { "neuron": [25, 50, 100] }
\`\`\`

### 高精度（小体系 / 发表级精度）
\`\`\`json
"fitting_net": { "neuron": [240, 240, 240] },
"descriptor": { "neuron": [25, 50, 100] }
\`\`\`

### 调优流程
1. 先用标准参数跑一轮 baseline
2. 缩小 fitting_net 看精度变化（通常影响小）
3. 如果精度不够，优先增大 embedding_net
4. 如果计算太慢，优先缩小 fitting_net
`},{slug:"lcurve-out-guide",title:"lcurve.out 训练曲线解读与异常诊断",category:"deepmd-training",summary:"lcurve.out 各列含义、正常/异常曲线形态、常见训练问题的诊断方法",tags:["deepmd","lcurve","训练曲线","诊断","loss"],sourceFiles:["deepmodeling/deepmd-kit/doc/train/training.md"],content:`# lcurve.out 训练曲线解读

## 列含义

\`\`\`text
#  step      rmse_val    rmse_trn    rmse_e_val  rmse_e_trn    rmse_f_val  rmse_f_trn         lr
0      3.33e+01    3.41e+01      1.03e+01    1.03e+01      8.39e-01    8.72e-01    1.0e-03
\`\`\`

| 列名 | 含义 | 单位 |
|------|------|------|
| step | 训练步数 | - |
| rmse_val | 验证集总损失 | - |
| rmse_trn | 训练集总损失 | - |
| rmse_e_val | 验证集能量 RMSE | eV/atom |
| rmse_e_trn | 训练集能量 RMSE | eV/atom |
| rmse_f_val | 验证集力 RMSE | eV/\xc5 |
| rmse_f_trn | 训练集力 RMSE | eV/\xc5 |
| lr | 当前学习率 | - |

> **关键**：能量 RMSE 是按原子数归一化的（per-atom），力 RMSE 不是。

## 正常曲线形态

\`\`\`text
初始阶段 (0-10k步):  loss 快速下降（从 ~30 降到 ~5）
中期阶段 (10k-100k): loss 缓慢下降（从 ~5 降到 ~1）
后期阶段 (100k+):    loss 趋于平稳（< 1），val/trn 接近
\`\`\`

## 异常诊断

### 1. loss_f 震荡不降
- **原因**：学习率太大
- **解决**：降低 start_lr（如 0.001 → 0.0005）

### 2. loss_f 突然跳高
- **原因**：数据中有异常帧（力 > 50 eV/\xc5）
- **解决**：检查并剔除异常帧

### 3. val loss 远高于 trn loss
- **原因**：过拟合（训练数据量不足或训练步数太多）
- **解决**：增加训练数据、减少 numb_steps、增加 dropout

### 4. loss 不收敛（停留在高位）
- **原因 A**：数据质量问题（DFT 计算不收敛）
- **原因 B**：网络太小（embedding_net 不够大）
- **原因 C**：batch_size 太大
- **解决**：检查数据质量、增大网络、减小 batch_size

### 5. 能量 RMSE 低但力 RMSE 高
- **原因**：力的损失权重不够
- **解决**：增大 start_pref_f（如 1000 → 2000）

## 可视化脚本

\`\`\`python
import numpy as np
import matplotlib.pyplot as plt

data = np.genfromtxt("lcurve.out", names=True)
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4))

# 力 RMSE
ax1.plot(data["step"], data["rmse_f_val"], label="val")
ax1.plot(data["step"], data["rmse_f_trn"], label="trn", alpha=0.7)
ax1.set_xlabel("Step"); ax1.set_ylabel("Force RMSE (eV/\xc5)")
ax1.set_yscale("log"); ax1.legend(); ax1.grid()

# 能量 RMSE
ax2.plot(data["step"], data["rmse_e_val"], label="val")
ax2.plot(data["step"], data["rmse_e_trn"], label="trn", alpha=0.7)
ax2.set_xlabel("Step"); ax2.set_ylabel("Energy RMSE (eV/atom)")
ax2.set_yscale("log"); ax2.legend(); ax2.grid()

plt.tight_layout(); plt.savefig("lcurve.png", dpi=150); plt.show()
\`\`\`
`},{slug:"dpgen-troubleshooting",title:"DP-GEN 常见错误与排查清单",category:"dpgen-workflow",summary:"基于官方文档整理的 DP-GEN 常见报错、原因分析与解决方案",tags:["dpgen","报错","排查","troubleshooting","错误"],sourceFiles:["deepmodeling/dpgen/doc/user-guide/common-errors.md","deepmodeling/dpgen/doc/user-guide/troubleshooting.md"],content:`# DP-GEN 常见错误与排查清单

## 启动前检查清单

在运行 dpgen run 之前，逐项确认：

1. ✅ \`type_map\` 和 \`mass_map\` 元素顺序一致
2. ✅ \`fp_pp_files\` 元素顺序与 \`type_map\` 一致
3. ✅ \`init_data_sys\` 是一维列表，\`sys_configs\` 是二维列表
4. ✅ \`sel\` 大小与实际原子类型数匹配
5. ✅ \`sys_configs\` 中的 POSCAR 路径存在
6. ✅ JSON 文件格式正确（无多余逗号/括号）
7. ✅ 单个系统的帧数 > batch_size 和 numb_test

## 常见报错

### 1. "Command not found: xxx"
- **原因**：软件未安装 / conda 环境未激活 / machine.json 镜像选错
- **解决**：检查 conda 环境和 machine.json 中的命令路径

### 2. "undefined key xxx is not allowed in strict mode"
- **原因**：DP-GEN ≥ 0.10.7 启用了严格格式检查，旧版参数名不再允许
- **解决**：删除旧版参数，参考最新 examples 目录

### 3. "FileNotFoundError: graph.xxx.pb"
- **原因**：初始数据不正确导致模型未生成
- **解决**：检查 init_data_sys 路径和数据格式

### 4. "OSError: Cannot find valid a data system"
- **原因**：数据路径配置错误
- **注意**：\`init_data_sys\` 是一维列表，\`sys_configs\` 是二维列表
\`\`\`json
"init_data_sys": ["data/set.000/"],          // 一维
"sys_configs": [["POSCAR_1"], ["POSCAR_2"]]  // 二维
\`\`\`

### 5. "RuntimeError: job failed 3 times"
- **原因**：远程任务失败（提交冲突 / 输入文件错误）
- **排查**：
  1. 检查 remote_root 目录下的日志
  2. 手动运行 .sub 脚本查看具体错误
  3. 检查 train.log 获取 DeePMD-kit 详细报错

### 6. "find too many unsuccessfully terminated jobs"
- **原因**：失败任务比例超过 ratio_failure 阈值
- **解决**：提高 ratio_failure 或检查输入文件

### 7. "JSONDecodeError"
- **原因**：JSON 语法错误（缺少逗号/括号不匹配）
- **解决**：用 VS Code 的 JSON 语法检查或在线 JSON 验证器

### 8. 每轮只有极少 candidate
- **可能原因**：
  - trust_lo 设得太高
  - 初始数据已覆盖很好
  - MD 温度太低，探索范围窄
- **解决**：降低 trust_lo、提高 MD 温度、增加 MD 步数

### 9. candidate 始终 > 50%
- **可能原因**：
  - trust_hi 设得太高
  - 模型训练不充分
  - 初始数据质量差
- **解决**：降低 trust_hi、增加训练步数、检查 DFT 数据

### 10. VASP 计算失败（02.fp 阶段）
- **检查**：
  - INCAR 是否包含 KSPACING 和 KGAMMA
  - POTCAR 元素顺序是否与 type_map 一致
  - ENCUT 是否足够（≥ 1.3 \xd7 ENMAX）
  - 是否被 conda 的 LD_LIBRARY_PATH 污染
`}],g=[{slug:"machine-json-guide",title:"DP-GEN machine.json 配置指南",category:"dpgen-workflow",summary:"machine.json 各字段详解：dispatcher_type、batch_type、context_type、本地/远程任务提交配置",tags:["dpgen","machine.json","配置","任务提交","HPC"],sourceFiles:["deepmodeling/dpgen/doc/run/mdata.rst"],content:`# DP-GEN machine.json 配置指南

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
`},{slug:"slurm-job-templates",title:"Slurm 作业模板：DP-GEN / VASP / LAMMPS",category:"vasp-hpc",summary:"Slurm 调度系统下的作业提交模板，含 sbatch/squeue/scancel 命令速查",tags:["slurm","HPC","作业提交","sbatch","超算"],sourceFiles:["slurm.schedmd.com"],content:`# Slurm 作业模板

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
`}],f=[{id:"cmd-dpgen-run",category:"command",label:"启动 dpgen",description:"在项目目录下启动 dpgen 主动学习",code:"dpgen run param.json machine.json 2>&1 | tee -a dpgen.log",tags:["dpgen","启动"]},{id:"cmd-dp-train",category:"command",label:"DeePMD 训练",description:"使用 input.json 训练 DeePMD 模型",code:"dp train input.json",tags:["deepmd","训练"]},{id:"cmd-dp-freeze",category:"command",label:"冻结模型",description:"将 checkpoint 转为 .pb 文件",code:"dp freeze -o graph.pb",tags:["deepmd","模型导出"]},{id:"cmd-lmp-deepmd",category:"command",label:"LAMMPS + DeePMD",description:"使用 DeePMD 势的 LAMMPS 运行",code:"lmp -in input.lammps",tags:["lammps","deepmd"]},{id:"cmd-vasp-run",category:"command",label:"运行 VASP",description:"标准 VASP 运行命令（单节点）",code:"mpirun -np $NP /path/to/vasp_std > vasp.out 2>&1",tags:["vasp","mpi"]},{id:"cmd-qsub",category:"command",label:"提交 PBS 作业",description:"提交作业到超算 batch 队列",code:"qsub job.pbs",tags:["pbs","超算"]},{id:"cmd-qstat",category:"command",label:"查看作业状态",description:"查看当前用户在 PBS 队列中的作业",code:"qstat -u student2025",tags:["pbs","监控"]},{id:"cmd-qdel",category:"command",label:"删除作业",description:"从 PBS 队列中删除指定作业",code:"qdel 12345",tags:["pbs","运维"]},{id:"cmd-tail-log",category:"command",label:"查看最新日志",description:"查看 dpgen 日志最后 20 行",code:"tail -20 dpgen.log",tags:["日志","监控"]},{id:"cmd-grep-error",category:"command",label:"搜索日志报错",description:"在 dpgen 日志中搜索错误关键词",code:'grep -iE "error|exception|killed|oom|segfault|traceback|failed" dpgen.log | tail -20',tags:["日志","调试"]},{id:"cmd-kill-all",category:"command",label:"停止所有 dpgen 进程",description:"一键杀掉训练+探索+标注",code:'pkill -9 -f "dpgen run"; pkill -9 -f lmp; pkill -9 -f vasp; pkill -9 -f deepmd; pkill -9 -f "dp train"',tags:["进程","运维"]},{id:"cmd-scp-upload",category:"command",label:"上传文件到超算",description:"用 scp 上传到超算服务器的 dpgen 工作目录",code:"scp file student2025@10.157.197.40:/public/home/student2025/zhuangjingrun/dpgen_work/",tags:["scp","超算","传输"]},{id:"cmd-conda-activate",category:"command",label:"激活 conda 环境",description:"训练用 deepmd，dpgen 用 deepmd2",code:"conda activate deepmd2  # dpgen\nconda activate deepmd   # train",tags:["conda","环境"]},{id:"param-trust-lo",category:"param",label:"model_devi_f_trust_lo",description:"力偏差下界（eV/Å），低于此值认为模型准确",code:'"model_devi_f_trust_lo": 0.05',tags:["dpgen","信任度"]},{id:"param-trust-hi",category:"param",label:"model_devi_f_trust_hi",description:"力偏差上界（eV/Å），高于此值触发 VASP 标注",code:'"model_devi_f_trust_hi": 0.35',tags:["dpgen","信任度"]},{id:"param-numb-models",category:"param",label:"numb_models",description:"Committee 模型数量，通常为 4",code:'"numb_models": 4',tags:["dpgen","训练"]},{id:"param-numb-steps",category:"param",label:"numb_steps",description:"每轮训练的总步数",code:'"numb_steps": 400000',tags:["deepmd","训练"]},{id:"param-rcut",category:"param",label:"rcut / rcut_smth",description:"截断半径与平滑截断起点（Å）",code:'"rcut": 6.5,\n"rcut_smth": 5.0',tags:["deepmd","descriptor"]},{id:"param-sel",category:"param",label:"sel (近邻数)",description:"每种元素的截断半径内最大近邻原子数",code:'"sel": [40, 40]',tags:["deepmd","descriptor"]},{id:"param-fp-task-max",category:"param",label:"fp_task_max / fp_task_min",description:"每轮最多/最少 VASP 标注数",code:'"fp_task_max": 50,\n"fp_task_min": 1',tags:["dpgen","fp"]},{id:"cmd-dp-neighbor-stat",category:"command",label:"dp neighbor-stat 统计近邻",description:"统计训练数据中每种原子的最大近邻数，用于确定 sel 参数",code:"# PyTorch 后端\ndp --pt neighbor-stat -s data -r 6.0 -t O H\n# 输出 max_nbor_size: [38, 72]\n# 含义：O 最多38个近邻，H 最多72个\n# sel 应设为更高值（如 [46, 92]），留余量给 MD 极端构型",tags:["deepmd","sel","neighbor-stat","近邻统计"]},{id:"cmd-dp-compress",category:"command",label:"dp compress 模型压缩",description:"压缩模型实现 2-4x 推理加速（五阶多项式查表 + 算子合并）",code:"# TensorFlow\ndp compress -i graph.pb -o graph-compressed.pb\n\n# PyTorch\ndp --pt compress -i model.pth -o model-compressed.pth\n\n# 压缩后精度损失极小，推荐生产环境使用",tags:["deepmd","压缩","加速","compress"]},{id:"cmd-dp-pretrained",category:"command",label:"dp pretrained 预训练模型",description:"下载官方预训练大模型（DPA-2/DPA-3），可直接用于推理或微调",code:'# 下载预训练模型\ndp pretrained download DPA-3.3-1M\ndp pretrained download DPA-3.2-5M\n\n# Python 中直接使用（自动下载）\nfrom deepmd.infer import DeepPot\npot = DeepPot("DPA-3.2-5M")',tags:["deepmd","预训练","DPA","pretrained"]},{id:"cmd-dp-freeze-pt",category:"command",label:"dp freeze (PyTorch)",description:"PyTorch 后端冻结模型，输出 .pth 文件",code:"# PyTorch 后端\ndp --pt freeze -o model.pth\n\n# 多任务训练时指定 head\ndp --pt freeze -o model_branch1.pth --head CHOSEN_BRANCH",tags:["deepmd","freeze","PyTorch"]},{id:"cmd-dp-test",category:"command",label:"dp test 模型测试",description:"在测试集上评估模型精度（能量/力 RMSE）",code:"dp test -m frozen_model.pb -s test_data/ -n 100\n# 输出：\n# Energy RMSE: 0.0008 eV/atom\n# Force  RMSE: 0.0460 eV/Å\n\n# PyTorch 后端\ndp --pt test -m model.pth -s test_data/",tags:["deepmd","测试","RMSE"]},{id:"cmd-dp-restart",category:"command",label:"dp train 恢复/初始化训练",description:"从 checkpoint 恢复训练，或从已有模型初始化",code:"# 从 checkpoint 恢复（中断后续跑）\ndp train input.json --restart model.ckpt.pt\n\n# 从已有模型初始化（迁移学习）\ndp train input.json --init-model model.ckpt\n\n# 从冻结模型初始化（调整 sel 等）\ndp train input.json --init-frz-model frozen_model.pb",tags:["deepmd","恢复","初始化","迁移学习"]},{id:"cmd-lcurve-viz",category:"command",label:"lcurve.out 训练曲线可视化",description:"用 matplotlib 可视化 lcurve.out 训练曲线",code:'import numpy as np\nimport matplotlib.pyplot as plt\n\ndata = np.genfromtxt("lcurve.out", names=True)\nfor name in data.dtype.names[1:-1]:\n    plt.plot(data["step"], data[name], label=name)\nplt.legend()\nplt.xlabel("Step")\nplt.ylabel("Loss")\nplt.xscale("symlog")\nplt.yscale("log")\nplt.grid()\nplt.show()',tags:["deepmd","可视化","lcurve","训练曲线"]},{id:"param-desc-se-e2-a",category:"param",label:"descriptor: se_e2_a",description:"最常用描述符：两体嵌入 + 角度信息（径向+角度），适合大多数体系",code:'"descriptor": {\n  "type": "se_e2_a",\n  "rcut": 6.0,        // 截断半径 (Å)\n  "rcut_smth": 0.5,   // 平滑截断起点 (Å)\n  "sel": [46, 92],     // 每种元素最大近邻数\n  "neuron": [25, 50, 100],  // 嵌入网络每层神经元\n  "axis_neuron": 16,   // 轴神经元数（子矩阵维度）\n  "type_one_side": true, // true=仅按邻居类型区分参数\n  "resnet_dt": false,  // ResNet 时间步\n  "seed": 1\n}',tags:["deepmd","descriptor","se_e2_a","参数"]},{id:"param-desc-se-e2-r",category:"param",label:"descriptor: se_e2_r",description:"仅径向描述符：只用距离信息，不含角度，计算更快但精度稍低",code:'"descriptor": {\n  "type": "se_e2_r",\n  "rcut": 6.0,\n  "rcut_smth": 0.5,\n  "sel": [46, 92],\n  "neuron": [5, 10, 20],  // 网络比 se_e2_a 小\n  "type_one_side": true,\n  "resnet_dt": false,\n  "seed": 1\n}',tags:["deepmd","descriptor","se_e2_r","参数"]},{id:"param-desc-se-e3",category:"param",label:"descriptor: se_e3",description:"三体嵌入描述符：含键角信息，精度更高但计算量更大",code:'"descriptor": {\n  "type": "se_e3",\n  "rcut": 6.0,\n  "rcut_smth": 0.5,\n  "sel": [40, 80],\n  "neuron": [2, 4, 8],  // 三体网络更小\n  "resnet_dt": false,\n  "seed": 1\n}',tags:["deepmd","descriptor","se_e3","参数"]},{id:"param-desc-comparison",category:"param",label:"描述符选择对比",description:"se_e2_a(默认推荐) vs se_e2_r(快速) vs se_e3(高精度) vs hybrid(混合)：精度递增、速度递减",code:"se_e2_a  → 两体嵌入+角度，精度好速度适中（默认选择）\nse_e2_r  → 仅径向，速度快但精度低（大体系快速筛选）\nse_e3    → 三体嵌入+键角，精度最高但最慢（小体系高精度）\nhybrid   → 混合多种 descriptor，可设不同截断半径",tags:["deepmd","descriptor","选择","hybrid"]},{id:"param-desc-hybrid",category:"param",label:"descriptor: hybrid 混合描述符",description:"将多种 descriptor 拼接，可组合不同截断半径和类型",code:'"descriptor": {\n  "type": "hybrid",\n  "list": [\n    { "type": "se_e2_a", "rcut": 6.0, ... },\n    { "type": "se_e2_r", "rcut": 8.0, ... }\n  ]\n}',tags:["deepmd","descriptor","hybrid","混合"]},{id:"param-net-size-guide",category:"param",label:"网络大小调优经验",description:"fitting_net 缩小影响小（<5%），embedding_net 缩小影响大（50%+）",code:"官方 benchmark (Al₂O₃ 力 RMSE eV/Å):\n\nfitting_net 变化（embedding=[25,50,100]固定）:\n[240,240,240] → 0.040\n[80,80,80]   → 0.040\n[20,20,20]   → 0.041\n[] (线性)    → 0.054\n\nembedding_net 变化（fitting=[240,240,240]固定）:\n[25,50,100]  → 0.040\n[10,20,40]   → 0.047\n[4,8,16]     → 0.073\n[1,2,4]      → 0.097\n\n策略：优先保证 embedding_net 够大",tags:["deepmd","网络大小","调优","benchmark"]},{id:"param-lcurve-columns",category:"param",label:"lcurve.out 列含义",description:"训练曲线文件各列的含义和单位",code:"列顺序:\nstep         训练步数\nrmse_val     验证集总损失\nrmse_trn     训练集总损失\nrmse_e_val   验证集能量 RMSE (eV/atom)\nrmse_e_trn   训练集能量 RMSE (eV/atom)\nrmse_f_val   验证集力 RMSE (eV/Å)\nrmse_f_trn   训练集力 RMSE (eV/Å)\nlr           当前学习率\n\n正常: loss 持续下降, val≈trn\n异常: loss 震荡/跳高/不收敛",tags:["deepmd","lcurve","训练曲线","诊断"]},{id:"param-fitting-net",category:"param",label:"fitting_net 拟合网络",description:"将 descriptor 映射到原子能量的神经网络",code:'"fitting_net": {\n  "neuron": [240, 240, 240],  // 每层神经元数\n  "resnet_dt": true,          // ResNet 时间步（推荐 true）\n  "seed": 1,\n  "precision": "float64"      // float64(高精度) 或 float32(混合精度)\n}',tags:["deepmd","fitting_net","参数"]},{id:"param-lr-exp",category:"param",label:"学习率: exp 指数衰减",description:"默认学习率策略，lr = start_lr × decay_rate^(step/decay_steps)",code:'"learning_rate": {\n  "type": "exp",\n  "start_lr": 0.001,    // 初始学习率\n  "stop_lr": 1e-6,      // 终止学习率\n  "decay_steps": 5000,  // 衰减步数\n  "decay_rate": 0.95,   // 衰减率（可选，自动计算）\n  "smooth": false,      // true=平滑衰减，false=阶梯衰减\n  "warmup_steps": 0     // 预热步数（可选）\n}',tags:["deepmd","学习率","exp","参数"]},{id:"param-lr-cosine",category:"param",label:"学习率: cosine 余弦退火",description:"余弦曲线衰减，通常比指数衰减收敛更平滑",code:'"learning_rate": {\n  "type": "cosine",\n  "start_lr": 0.001,\n  "stop_lr": 1e-6,\n  "warmup_steps": 5000  // 预热阶段线性增加\n}',tags:["deepmd","学习率","cosine","参数"]},{id:"param-lr-wsd",category:"param",label:"学习率: wsd 预热-稳定-衰减",description:"大部分时间保持 start_lr，最后 decay_phase_ratio 比例做衰减",code:'"learning_rate": {\n  "type": "wsd",\n  "start_lr": 0.001,\n  "stop_lr": 1e-6,\n  "decay_phase_ratio": 0.1,  // 最后10%步数做衰减\n  "decay_type": "inverse_linear"  // 衰减类型：inverse_linear/cosine/linear\n}',tags:["deepmd","学习率","wsd","参数"]},{id:"param-loss-prefactors",category:"param",label:"loss 损失权重",description:"能量/力/virial 损失的权重系数，随学习率线性变化",code:'"loss": {\n  "start_pref_e": 0.02,   // 能量损失初始权重\n  "limit_pref_e": 1,      // 能量损失最终权重\n  "start_pref_f": 1000,   // 力损失初始权重（重点学力）\n  "limit_pref_f": 1,      // 力损失最终权重\n  "start_pref_v": 0,      // virial 初始权重（通常为0）\n  "limit_pref_v": 0,      // virial 最终权重\n  "loss_func": "mse",     // mse(L2) 或 mae(L1, 抗异常值)\n  "intensive_ener_virial": false  // true=按N²归一化（多体系推荐）\n}',tags:["deepmd","loss","权重","参数"]},{id:"param-training-section",category:"param",label:"training 训练配置",description:"训练步数、数据、验证、混合精度等核心设置",code:'"training": {\n  "training_data": {\n    "systems": ["data0/", "data1/"],  // 训练数据路径\n    "batch_size": "auto",  // auto:N → batch×原子数≥N\n    "auto_prob": "prob_sys_size"  // 按系统大小分配概率\n  },\n  "validation_data": {\n    "systems": ["data_val/"],\n    "batch_size": 1,\n    "numb_btch": 3\n  },\n  "numb_steps": 400000,\n  "seed": 1,\n  "disp_file": "lcurve.out",\n  "disp_freq": 100,\n  "save_freq": 1000,\n  "mixed_precision": {  // 可选：混合精度训练\n    "output_prec": "float32",\n    "compute_prec": "float16"\n  }\n}',tags:["deepmd","training","batch_size","参数"]},{id:"param-optimizer",category:"param",label:"optimizer 优化器",description:"训练优化器选择：Adam(默认), AdamW, LKF, AdaMuon(仅PyTorch)",code:'"optimizer": {\n  "type": "Adam",      // TF: 仅Adam; PT: Adam/AdamW/LKF/AdaMuon\n  "adam_beta1": 0.9,   // Adam 一阶矩衰减率\n  "adam_beta2": 0.999, // Adam 二阶矩衰减率\n  "weight_decay": 0     // L2 正则化权重（AdamW 解耦）\n}',tags:["deepmd","optimizer","Adam","参数"]},{id:"param-model-devi-jobs",category:"param",label:"model_devi_jobs 探索任务",description:"DP-GEN MD 探索配置：温度、压力、步长、系综",code:'"model_devi_jobs": [{\n  "sys_idx": [0],       // 使用第0组初始结构\n  "temps": [300, 600, 1000],  // 温度列表 (K)\n  "press": [1.0],       // 压力列表 (bar)\n  "trj_freq": 10,       // 每10步保存一帧\n  "nsteps": 3000,       // MD 总步数\n  "ensemble": "nvt",    // 系综: nvt/npt/nve\n  "_idx": "00"          // 迭代编号\n}]',tags:["dpgen","model_devi","MD","探索"]},{id:"param-model-devi-dt",category:"param",label:"model_devi_dt / model_devi_skip",description:"MD 时间步长(ps)和跳过帧数（每隔skip帧保存）",code:'"model_devi_dt": 0.002,    // 时间步长 0.002 ps = 2 fs\n"model_devi_skip": 0,      // 跳过前N帧（0=全部保存）\n"model_devi_clean_traj": true  // 清理轨迹文件节省空间',tags:["dpgen","model_devi","时间步"]},{id:"path-local-dp-train",category:"path",label:"dp (训练)",description:"deepmd 环境中的 dp 可执行文件",code:"/home/kobe/miniconda3/envs/deepmd/bin/dp",tags:["deepmd","本地路径"]},{id:"path-local-dpgen",category:"path",label:"dpgen",description:"deepmd2 环境中的 dpgen 可执行文件",code:"/home/kobe/miniconda3/envs/deepmd2/bin/dpgen",tags:["dpgen","本地路径"]},{id:"path-local-lmp",category:"path",label:"lmp (DeePMD版)",description:"deepmd 环境中的 LAMMPS",code:"/home/kobe/miniconda3/envs/deepmd/bin/lmp",tags:["lammps","本地路径"]},{id:"path-hpc-vasp",category:"path",label:"vasp_std (超算)",description:"超算上的 VASP 可执行文件",code:"/public/software/vasp.5.4.4/bin/vasp_std",tags:["vasp","超算路径"]},{id:"path-hpc-intel",category:"path",label:"Intel 环境 (超算)",description:"超算 Intel 编译环境初始化脚本",code:"source /public/software/intel2020u2/intel2020u2_env.sh",tags:["超算路径","环境"]},{id:"path-hpc-work",category:"path",label:"dpgen 工作目录 (超算)",description:"超算上 dpgen 的 remote_root",code:"/public/home/student2025/zhuangjingrun/dpgen_work/",tags:["dpgen","超算路径"]},{id:"path-local-project",category:"path",label:"项目根目录",description:"TiC MLP 项目的本地根目录",code:"~/vasp_run/TiC_MLP/",tags:["项目","本地路径"]},{id:"script-clean-startup",category:"script",label:"干净环境启动",description:"避免 conda 污染 VASP 动态库的启动脚本",code:`#!/bin/bash
source /home/kobe/miniconda3/etc/profile.d/conda.sh
conda activate dpgen_test_env
unset LD_LIBRARY_PATH
export PATH=/home/kobe/miniconda3/envs/dpgen_test_env/bin:/usr/local/bin:/usr/bin:/bin
dpgen run param.json machine.json`,tags:["启动","脚本","环境"]},{id:"script-watch-dpgen",category:"script",label:"dpgen 监控脚本",description:"每30秒检查进程存活+报错扫描+进度显示",code:`#!/bin/bash
while true; do
  pgrep -f "dpgen run" > /dev/null && echo "✅ running" || echo "❌ dead"
  tail -100 dpgen.log | grep -iE "error|failed" | tail -5
  sleep 30
done`,tags:["监控","脚本","dpgen"]},{id:"cmd-sbatch",category:"command",label:"提交 Slurm 作业",description:"用 sbatch 提交作业到 Slurm 集群",code:"sbatch job.slurm",tags:["slurm","超算","提交"]},{id:"cmd-squeue",category:"command",label:"查看 Slurm 作业",description:"查看当前用户的 Slurm 作业状态",code:"squeue -u $USER",tags:["slurm","监控"]},{id:"cmd-scancel",category:"command",label:"取消 Slurm 作业",description:"取消指定的 Slurm 作业",code:"scancel 12345",tags:["slurm","运维"]},{id:"param-machine-json-batch",category:"param",label:"machine.json batch_type",description:"DP-GEN 任务批处理类型：PBS/Slurm/LSF/Shell",code:'"batch_type": "Slurm"  # Slurm 集群\n"batch_type": "PBS"     # PBS/Torque 集群\n"batch_type": "Shell"   # 本地直接执行',tags:["dpgen","machine.json","slurm","pbs"]},{id:"cmd-dpdata-read-outcar",category:"command",label:"dpdata 读取 OUTCAR",description:"用 dpdata 从 VASP OUTCAR 提取训练数据",code:'import dpdata\ns = dpdata.LabeledSystem("OUTCAR", fmt="vasp/outcar")\nprint(f"帧数: {len(s)}, 原子数: {s.get_natoms()}")',tags:["dpdata","VASP","数据转换"]},{id:"cmd-dpdata-export-npy",category:"command",label:"dpdata 导出 DeePMD 格式",description:"将 LabeledSystem 导出为 DeePMD numpy 训练格式",code:'s.to_deepmd_npy("training_data/")\n# 生成 set.000/ 目录：box.npy, coord.npy, energy.npy, force.npy, virial.npy',tags:["dpdata","deepmd","数据转换"]},{id:"cmd-dpdata-merge",category:"command",label:"dpdata 合并多个系统",description:"合并多个 OUTCAR 的数据（DP-GEN 数据回流核心操作）",code:'merged = dpdata.LabeledSystem("OUTCAR_1")\nfor f in ["OUTCAR_2", "OUTCAR_3"]:\n    merged.append(dpdata.LabeledSystem(f))\nmerged.to_deepmd_npy("merged_data/")',tags:["dpdata","合并","数据回流"]},{id:"cmd-dpdata-vasprun",category:"command",label:"dpdata 读取 vasprun.xml",description:"从 vasprun.xml 读取（比 OUTCAR 更稳定）",code:'s = dpdata.LabeledSystem("vasprun.xml", fmt="vasp/xml")',tags:["dpdata","VASP","xml"]},{id:"cmd-dpdata-subsystem",category:"command",label:"dpdata 切分数据",description:"按索引切分子集（训练/测试分离）",code:'import numpy as np\nidx = np.random.permutation(len(s))[:80]\ntrain = s.sub_system(idx)\ntrain.to_deepmd_npy("train/")',tags:["dpdata","切分","训练集"]},{id:"cmd-dpdata-batch-collect",category:"command",label:"批量收集 FP OUTCAR",description:"DP-GEN 一轮迭代后批量收集标注数据",code:'from pathlib import Path\nsystems = []\nfor d in sorted(Path("iter.000000/02.fp").glob("task.*")):\n    if (d/"OUTCAR").exists():\n        systems.append(dpdata.LabeledSystem(str(d/"OUTCAR")))\nm = systems[0]\nfor s in systems[1:]: m.append(s)\nm.to_deepmd_npy("new_data/")',tags:["dpdata","dpgen","批量","数据回流"]},{id:"param-dpdata-formats",category:"param",label:"dpdata 支持格式全表",description:"dpdata 支持的所有输入/输出格式（25+种）",code:"读取格式 (fmt 参数):\nvasp/outcar    VASP OUTCAR\nvasp/xml       VASP vasprun.xml\nvasp/poscar    VASP POSCAR\ndeepmd/npy     DeePMD numpy\ndeepmd/raw     DeePMD 文本\ngaussian/log   Gaussian 日志\ncp2k/output    CP2K 输出\nqe/pw/scf      Quantum ESPRESSO\nlammps/dump    LAMMPS dump\nlammps/data    LAMMPS data\nfhi_aims/output FHI-aims\nsiesta/output  SIESTA\nabacus/md      ABACUS\nquip/gap/xyz   QUIP/GAP\nxyz            通用 XYZ\n\n导出方法:\n.to_deepmd_npy() .to_deepmd_raw()\n.to_vasp_poscar() .to_lammps_lmp()",tags:["dpdata","格式","API"]},{id:"cmd-dpdata-quality-check",category:"command",label:"dpdata 数据质量检查",description:"检查训练数据的力/能量分布，排除异常帧",code:'import numpy as np\nforces = system.data["forces"]  # (n_frames, n_atoms, 3)\nforce_max = np.abs(forces).max(axis=(1,2))\nbad = np.where(force_max > 50)[0]  # 力>50 eV/Å为异常\nprint(f"异常帧: {len(bad)}/{len(system)}")\nif len(bad): print(f"索引: {bad.tolist()}")',tags:["dpdata","质量检查","异常值"]},{id:"cmd-dpdata-energy-shift",category:"command",label:"dpdata 能量参考对齐",description:"不同 DFT 计算的能量参考不一致时，需要对齐能量零点",code:'import numpy as np\n# 计算每原子平均能量作为参考\ne_per_atom = system.data["energies"] / system.get_natoms()\nref_e = np.mean(e_per_atom)  # 或用已知参考值\n# 手动偏移（dpdata 暂无内置方法）\nsystem.data["energies"] -= shift_value',tags:["dpdata","能量对齐","参考"]},{id:"cmd-ovito-python",category:"command",label:"OVITO Python 管线",description:"导入 LAMMPS dump 并进行 PTM 结构分析",code:"from ovito.io import import_file\nfrom ovito.modifiers import PolyhedralTemplateMatchingModifier\n\npipeline = import_file('dump.lammpstrj')\npipeline.modifiers.append(PolyhedralTemplateMatchingModifier())",tags:["ovito","python","PTM"]},{id:"cmd-ovito-dxa",category:"command",label:"DXA 位错分析",description:"Python 脚本做位错提取与密度统计",code:"from ovito.modifiers import DislocationAnalysisModifier\n\npipeline.modifiers.append(DislocationAnalysisModifier())\ndata = pipeline.compute()\nL = data.attributes['DislocationAnalysis.total_line_length']\nV = data.attributes['DislocationAnalysis.cell_volume']\nprint(f'Dislocation density: {L/V:.3e} A^-2')",tags:["ovito","DXA","位错"]},{id:"cmd-ovito-tachyon",category:"command",label:"Tachyon 高质量渲染",description:"使用 OVITO Tachyon 渲染发表级图像",code:"from ovito.vis import Viewport, TachyonRenderer\n\nvp = Viewport(type=Viewport.Type.Perspective)\nvp.render_image(size=(1920,1080), filename='render.png',\n  renderer=TachyonRenderer(ambient_occlusion=True, shadows=True))",tags:["ovito","渲染","Tachyon"]},{id:"cmd-ase-build",category:"command",label:"ASE 构建超胞/表面",description:"用 ASE 创建晶体结构、切表面、做超胞",code:"from ase.build import bulk, fcc111, make_supercell\n\ncu = bulk('Cu', 'fcc', a=3.61)\ncu_sc = cu * (3, 3, 3)  # 超胞\ncu111 = fcc111('Cu', a=3.61, size=(2,2,4), vacuum=10.0)  # 表面",tags:["ase","结构","表面"]},{id:"cmd-ase-relax",category:"command",label:"ASE 结构弛豫",description:"对接 VASP/GPAW 做 BFGS 弛豫",code:"from ase.optimize import BFGS\nfrom ase.calculators.vasp import Vasp\n\natoms.calc = Vasp(xc='PBE', encut=500, kpts=(4,4,1), directory='relax')\nopt = BFGS(atoms)\nopt.run(fmax=0.02)  # eV/A",tags:["ase","弛豫","DFT"]},{id:"cmd-lmp-npt",category:"command",label:"LAMMPS NPT 分子动力学",description:"等温等压系综 MD 运行（含弛豫）",code:"units metal\ntimestep 0.001\nvelocity all create 300 12345\nfix npt all npt temp 300 300 0.1 iso 0 0 1.0\nrun 100000",tags:["lammps","NPT","MD"]},{id:"cmd-lmp-minimize",category:"command",label:"LAMMPS 能量最小化",description:"MD 前先做能量最小化消除坏接触",code:"minimize 1.0e-10 1.0e-10 10000 100000",tags:["lammps","最小化","MD"]},{id:"param-encut-convergence",category:"param",label:"ENCUT 截断能",description:"PBE 泛函推荐 ENCUT = 1.3 × max(ENMAX)，弹性常数建议 1.5×",code:"ENCUT = 500  # 1.3 × ENMAX\n# 收敛测试: for ENCUT in 300 400 500 600",tags:["dft","encut","收敛"]},{id:"param-kpoint-density",category:"param",label:"K 点密度",description:"k_i × a_i ≈ 30-40 Å 为精确计算，能带用高对称路径，DOS 加密 2-3×",code:"# vaspkit -task 102 生成 KPOINTS\n# 输入密度 ~0.04 (精确) 或 ~0.03 (DOS)",tags:["dft","kpoints","收敛"]},{id:"param-smearing",category:"param",label:"ISMEAR / SIGMA",description:"半导体 ISMEAR=0, SIGMA=0.05；金属 ISMEAR=1；能带/DOS 用 ISMEAR=-5 (四面体)",code:"ISMEAR = 0    # 半导体: Gaussian\nSIGMA = 0.05\nISMEAR = 1    # 金属: Methfessel-Paxton\nISMEAR = -5   # DOS/能带: 四面体方法",tags:["dft","smearing","VASP"]}];e.s(["cheatsheetItems",0,f],95228);let y={"dpgen-workflow":"2026-07-31","dpgen-handson":"2026-06-04","deepmd-training":"2026-06-04","deepmd-quickstart":"2026-06-04","deepmd-tuning":"2026-06-04","lammps-deepmd":"2026-06-04","dpdata-guide":"2026-06-04","machine-config":"2026-06-04","vasp-hpc":"2026-06-02","comp-materials":"2026-06-02","atomistic-sim":"2026-06-02","ovito-tips":"2026-06-02","env-config":"2026-06-02","linux-tips":"2026-06-02",methodology:"2026-06-02"};function P(e,t){let a=y[t]??"2026-06-02";return e.map(e=>({...e,createdAt:e.createdAt??a,updatedAt:e.updatedAt??a}))}let h=[...P(t,"dpgen-workflow"),...P(m,"dpgen-handson"),...P(a,"deepmd-training"),...P(l,"deepmd-quickstart"),...P(n,"vasp-hpc"),...P(o,"env-config"),...P(s,"linux-tips"),...P(i,"methodology"),...P(p,"comp-materials"),...P(r,"atomistic-sim"),...P(d,"ovito-tips"),...P(c,"lammps-deepmd"),...P(_,"dpdata-guide"),...P(u,"deepmd-tuning"),...P(g,"machine-config")];e.s(["allArticles",0,h],94757)}]);