import type { Article } from "@/lib/types";

export const dpgenWorkflowArticles: Article[] = [
  {
    slug: "dpgen-workflow-overview",
    title: "DP 势函数生成完整流程",
    category: "dpgen-workflow",
    summary: "DP 势函数生成五阶段完整流程（建模→DFT参数→初始数据集→主动学习循环→收敛判定），含数据集扩充方向约束难点标注与标准目录模板",
    content: `# DP 势函数生成完整流程

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
`,
    tags: ["dpgen", "workflow", "主动学习", "目录结构", "MLP"],
    sourceFiles: ["工作流程以及模版文件夹.md"],
  },
  {
    slug: "dpgen-check-commands",
    title: "DP-GEN 常用检查指令",
    category: "dpgen-workflow",
    summary: "dpgen 运行中查看日志、训练进度、VASP状态、标注成功率的常用命令集合",
    content: `# DP-GEN 常用检查指令

## 1. 查看最新日志（最常用）

\`\`\`bash
tail -20 dpgen.log
\`\`\`

## 2. 查看当前轮次和任务

\`\`\`bash
tail -5 record.dpgen
\`\`\`

## 3. 查看各轮 candidate 变化趋势

\`\`\`bash
grep "candidate" dpgen.log
\`\`\`

## 4. 查看训练进度（实时进度在 dpgen_work 里）

\`\`\`bash
tail -1 dpgen_work/*/lcurve.out
\`\`\`

## 5. 查看 VASP 是否在计算

\`\`\`bash
grep "Elapsed time" iter.000*/02.fp/task.*/OUTCAR 2>/dev/null | wc -l
\`\`\`

## 6. 查看 dpgen 进程是否还在跑

\`\`\`bash
ps aux | grep "dpgen run" | grep -v grep
\`\`\`

## 7. 查看每轮标注成功率

\`\`\`bash
grep "failed frame\|failed tasks" dpgen.log | tail -10
\`\`\`

## 标准启动流程

\`\`\`bash
conda activate dpgen_env
cd /path/to/your/dpgen
dpgen run param.json machine.json 2>&1 | tee -a dpgen.log
\`\`\`

## 续跑前防重复提交

\`\`\`bash
# 只清任务执行残留，绝不清 record.dpgen 和 iter.*
rm -rf ~/.dpdispatcher/submission/
\`\`\`

> ⚠️ 不要 \`rm -rf ~/.dpdispatcher\` 整个目录，也不要清 \`record.dpgen\` / \`iter.*\`——那是 checkpoint，清掉等于从头重算。
`,
    tags: ["dpgen", "日志", "监控", "检查", "命令"],
    sourceFiles: ["dpgen常用检查指令.txt"],
  },
  {
    slug: "dpgen-watch-script",
    title: "DP-GEN 自动监控脚本",
    category: "dpgen-workflow",
    summary: "一个 bash 脚本实现 dpgen 进程存活检测、日志报错扫描、最新进度显示，带颜色和响铃报警",
    content: `# DP-GEN 自动监控脚本

\`\`\`bash
#!/bin/bash
LOGFILE=/path/to/your/dpgen/dpgen.log  # ← 改成实际路径
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
`,
    tags: ["dpgen", "监控", "bash", "脚本", "自动化"],
    sourceFiles: ["11.txt"],
  },
  {
    slug: "kpoints-float-bug-fix",
    title: "KPOINTS Float Bug 修复（dpgen 源码修改）",
    category: "dpgen-workflow",
    summary: "DP-GEN v0.13.2 自动生成 KPOINTS 时出现浮点数 bug 导致 VASP 拒绝运行，需修改源码修复",
    content: `# KPOINTS Float Bug 修复

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
`,
    tags: ["dpgen", "KPOINTS", "VASP", "bugfix", "源码修改"],
    sourceFiles: ["vasp源码变动.md", "check_dpgen_patch.sh"],
  },
  {
    slug: "stop-dpgen-safely",
    title: "如何安全暂停/终止 dpgen",
    category: "dpgen-workflow",
    summary: "一键杀掉所有 dpgen 相关进程（训练+探索+标注），含事后检查方法",
    content: `# 如何安全暂停/终止 dpgen

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
`,
    tags: ["dpgen", "进程管理", "pkill", "运维"],
    sourceFiles: ["暂停.txt"],
  },
  {
    slug: "dpgen-clean-startup",
    title: "dpgen 启动脚本（干净环境）",
    category: "dpgen-workflow",
    summary: "避免 conda 环境污染导致 VASP 崩溃的启动方式",
    content: `# dpgen 启动脚本（干净环境）

## 推荐启动方式

\`\`\`bash
#!/bin/bash
source ~/miniconda3/etc/profile.d/conda.sh
conda activate dpgen_env
unset LD_LIBRARY_PATH
# 显式重建 PATH，剔除 conda 的动态库影响
export PATH=$HOME/miniconda3/envs/dpgen_env/bin:/usr/local/bin:/usr/bin:/bin:/opt/vasp/bin
dpgen run param.json machine.json
\`\`\`

## 为什么需要干净环境

VASP 是静态编译的 Fortran 程序，对动态库版本非常敏感。
如果 conda 环境的 \`LD_LIBRARY_PATH\` 污染了 VASP 的库搜索路径（尤其是 LAPACK/FFTW/Fortran runtime），会导致 SIGSEGV。

## 核心原则

- dpgen 可以在 conda 里运行
- VASP 不能继承 conda 的动态库环境
- 在 machine.json 的提交脚本里也要清理 LD_LIBRARY_PATH
`,
    tags: ["dpgen", "环境变量", "conda", "VASP", "启动"],
    sourceFiles: ["run.sh"],
  },
  {
    slug: "candidate-health-check",
    title: "模型偏差与 candidate 健康判断",
    category: "dpgen-workflow",
    summary: "如何通过 candidate 比例和 failed 比例判断主动学习是否健康",
    content: `# 模型偏差与 candidate 健康判断

## 先搞清楚三分类（最易记反）

DP-GEN 对每一帧只做一件事：按 \`f_trust_lo\` / \`f_trust_hi\` 归类。

| 判据 | 分类 | 去向 |
|------|------|------|
| \`max_devi_f ≤ trust_lo\` | **accurate** | 跳过 |
| \`trust_lo < max_devi_f ≤ trust_hi\` | **candidate** | 送 VASP 标注 |
| \`max_devi_f > trust_hi\` | **failed** | 丢弃 |

> ⚠️ **不是"偏差越大越要标注"**。超过 \`trust_hi\` 的帧被判 failed 直接丢弃，只有落在带内的才是 candidate。这一条记反，所有比例判读都会跟着反。

## candidate 比例怎么读

比例本身没有绝对的好坏，**必须先看阈值是否校准**，否则读出来的数字不可比：

| 现象 | 真实原因 | 建议 |
|------|---------|------|
| candidate 长期 > 80% | 多半是 \`trust_lo\` 定得过低，大量本该 accurate 的帧被塞进 candidate | **先按官方规则重算阈值**，再谈比例 |
| candidate 10~30% | 阈值大致合理，模型在正常学习 | 正常推进 |
| candidate < 5% | 模型已接近收敛，或探索范围太窄 | 可以判定收敛，或提高 MD 温度扩展探索 |
| failed > 90% | 模型很差或结构崩溃（原子飞散） | 检查初始训练数据、POSCAR 合理性、MD 温度是否过高 |

> 🔴 **反例警示**：某体系 \`trust_lo=0.07\` 时，accurate 只剩 0.76%、candidate 高达 90.78%。dpgen 每轮都"假装"模型什么都不懂，把大量本该判准确的帧送去算 FP——**循环能跑通，但 candidate 率这个健康度指标彻底失去意义**，且不可跨轮比较。这正是阈值没校准的典型症状，而不是"模型太差"。

## 阈值校准：官方经验规则

\`\`\`python
af = mean(|F|)              # 训练集所有原子-力分量的平均绝对值
f_trust_lo = 0.2 * af
f_trust_hi = 0.5 * af
\`\`\`

**先算 mean|F|，再按 0.2 / 0.5 倍套。** 别凭感觉拍数。

| 来源 | lo | hi |
|------|----|----|
| 官方经验规则（0.2× / 0.5× mean\|F\|） | 0.2·af | 0.5·af |
| DP-GEN handson 教程示例 | 0.05 | 0.15 |
| DP-GEN 论文 Cu 示例 | 0.05 | 0.20 |
| dpgen README 通用示例 | 0.25 | 0.45 |

> ⚠️ 官方明确提醒：**体系温度升高、力的幅度变大时，trust level 要相应调大。** 实测同一 \`lo=0.25\`，300 K 判 85.5% 准确，3200 K 只判 47.8%——高温体系必须单独设阈值。

## 关键参数

在 \`param.json\` 顶层（不在 \`model_devi\` 段内）：

\`\`\`json
{
  "model_devi_dt": 0.001,
  "model_devi_skip": 200,
  "model_devi_f_trust_lo": 0.25,
  "model_devi_f_trust_hi": 0.62
}
\`\`\`

## 调参策略

1. candidate 太多 → 先按 0.2×/0.5× 规则重算阈值，通常是把 **lo 抬高**
2. candidate 太少 → 降低 trust_lo，或提高 MD 温度扩展探索
3. failed 太多 → 检查训练收敛性与 MD 温度；failed 是"结构崩了"，不是"模型不会"
4. 不同体系偏差尺度差异大 → 用 list/dict 形式**按 sys_idx 分别设阈值**
5. 想直接控制每轮标多少帧 → 用 \`model_devi_adapt_trust_lo\` + \`model_devi_numb_candi_f\`

> ⚠️ **改 param.json 前先确认它是否真的生效**。若探索阶段已改为手工脚本（自己拼 LAMMPS 输入、自己筛选候选），dpgen 根本不参与，**改 param.json 的 trust 键零效果**——真正的阈值硬编码在脚本里。
`,
    tags: ["dpgen", "model_devi", "candidate", "信任度", "调参"],
    sourceFiles: ["dpgen常用检查指令.txt"],
  },
  {
    slug: "dpgen-state-and-resume",
    title: "DP-GEN 运行状态、续跑与静默陷阱",
    category: "dpgen-workflow",
    summary: "record.dpgen 阶段语义、copy_model 静默跳过训练、submission hash 失配重复提交、iter 目录红线、sys_probs 透传等源码级机制",
    content: `# DP-GEN 运行状态、续跑与静默陷阱

这一篇讲的是**"dpgen 没报错，但结果不对"**的那类问题。它们不会在日志里喊出来，只会让实验结论悄悄失效。

## 一、状态记在哪：三个位置各管什么

| 位置 | 是什么 | 用途 |
|------|--------|------|
| \`record.dpgen\` | 进度 checkpoint，每行 \`(迭代号 阶段号)\` | 判断跑到哪一步 |
| \`dpgen_work/<hash>/\` | 执行缓存 | **实时进度看这里** |
| \`iter.NNNNNN/\` | 最终产物 | collect 完成后才有完整文件 |

### record.dpgen 的语义

- 阶段号 0–8
- **看到阶段号 N = 第 N 阶段已完成**，下一步执行 N+1
- **绝不清 \`record.dpgen\` 和 \`iter.*\`**——那是 checkpoint，清掉等于从头重算

### 三条反直觉判读

| 现象 | 正确解读 |
|------|---------|
| 训练中 \`iter.N/00.train/000/\` 没有 \`frozen_model.pb\` | ✅ 正常，还没 collect 完，**不是失败** |
| \`dpgen_work/<hash>/\` 任务目录空了 | ✅ 可能已 collect 完成，**不是失败** |
| 找不到训练实时进度 | 去 \`dpgen_work/<hash>/\` 找 \`lcurve.out\`，不在 \`iter/\` |

## 二、自然终止：某一轮"只重训没探索"

\`make_model_devi\` 若发现 \`model_devi_jobs[iter]\` 不存在 → \`cont=False\` → break → 打印 \`finished\`。

**所以"某一轮只训练没探索"不是出错，是该 iter 的 jobs 条目没加。**

同理，\`model_devi_jobs\` 条目数必须 ≥ 迭代次数，否则 dpgen 提前报 Finished。

## 三、🔴 copy_model：训练被静默跳过

这是最隐蔽的坑。\`make_train\` 开头有 \`if iter_index > 0\` 分支：

\`\`\`python
# 用 glob("02.fp/data.*") 检查前一轮 FP 是否已产出数据
if _check_empty_iter(prev_iter):
    # 前一轮 fp 无 data.* → 直接复制旧模型，静默跳过训练
    copy_model(...)
\`\`\`

**触发条件**：前一轮 \`02.fp\` 里没有 \`data.*\` 目录——比如 VASP 还在超算排队，或者自定义流程把数据移走了。

**后果**：dpgen 打印"训练完成"，但模型完全没变。后续探索用的是旧模型，整个迭代白跑。

**应用**：进入下一轮 \`make_train\` 之前，先确认前一轮数据已落盘：

\`\`\`bash
ls iter.$(printf "%06d" $((N-1)))/02.fp/data.*
\`\`\`

## 四、🔴 运行中改 machine.json = 重复提交

\`submission hash\` **依赖 \`resources\`**。运行中修改 machine.json → \`try_recover_from_json()\` 匹配不到旧 hash → 当作全新 submission 重新提交 → **重复计算**。

在按卡时计费的平台上，这就是**重复花钱**。

**规则：必须等当前批次全部完成后再改。**

## 五、🔴 iter.NNNNNN 必须在 dpgen 根目录

把 \`iter.00000X/\` 移进 \`iterations/\` 子目录 → 断掉 \`data.iters/\` 与 \`old/model.ckpt\` 的**符号链接链** → old model 加载错误 → **训练发散（\`rmse_e\` 可达 2e15）**。

可以整理的只有 \`logs/\`、\`eval_*\`、\`melt_scan*\` 这类辅助目录。

## 六、sys_probs 原样透传，不补齐

dpgen 源码里 \`sys_probs\` 相关处理**零出现**——它被原样透传给 deepmd 训练的 \`input.json\`，**长度不匹配不报错、不自动补齐**。

长度 ≠ 系统数时，deepmd 采样 \`np.random.choice(nsystems, p=probs)\` 崩溃 → 训练子进程死。

**应用**：每轮新增 FP 系统后，\`sys_probs\` 必须扩到新长度。

> ⚠️ 校准 sys_probs 时用哪个帧数：必须是 deepmd **实际读到的帧数**，即 \`glob("set.*")\` 求和，**不是 \`set.000\` 单独的帧数**。目录里若残留 \`set.000_backup\`，两者会差一倍，配比直接失效。

## 七、sys_idx 只索引 sys_configs

- model_devi 的系统列表 = \`sys_configs\`（展开的 POSCAR）
- \`init_data_sys\` 是训练数据，**不参与 model_devi**
- 让 \`sys_idx\` 指向 \`init_data_sys\` 的索引 → \`sys_configs[idx]\` IndexError

✅ 解法：把需要的起点构型转成 POSCAR 放进 \`sys_configs\`：

\`\`\`python
import dpdata
System('init_data/some_start', fmt='deepmd/npy').to('vasp/poscar', 'sys_configs/new_start')
\`\`\`

## 八、同 sys_idx 的多条目会被去重

dpgen 有去重逻辑，**只取第一条**。所以一个条目内列出所有温度：

\`\`\`json
{ "sys_idx": [0], "temps": [300, 600, 1000], "press": [1, 1, 1] }
\`\`\`

不要拆成三个条目分别写 300/600/1000。

## 九、qdel 远程 job 后必须立即停 dpgen

\`run_fp\` 轮询发现 job terminated 会 \`fail_count+1\` 并 **自动 resubmit**——你 qdel 了，它又给你提一遍。

**改 FP 帧数的正确流程**：

1. \`qdel\` 远程 job
2. **立即**停 dpgen（\`tmux kill-session\` 或 \`pkill -9 -f "dpgen run"\`）
3. 回退 \`record.dpgen\`（如 \`head -n -2\`）
4. 清 \`02.fp\` 的 \`task.*\` 与 \`*.out\`（**保留 POTCAR**）
5. 改 \`param.json\` 的 \`fp_task_max\`
6. 重启 dpgen

## 十、停 dpgen 要连根杀 wrapper 链

只 kill master 进程后，\`.sub\` 链会残留继续训练；而 \`flag_if_job_task_fail=1\` 会把整个 job 判死。

\`\`\`bash
pkill -9 -f "dpgen run"
pkill -9 -f lmp
pkill -9 -f "dp train"
ps -ef | grep -E "dpgen|lmp|dp train" | grep -v grep   # 确认干净
\`\`\`

## 十一、续跑启动脚本的铁律

- **绝不清** \`record.dpgen\` / \`iter.*\`（checkpoint）
- **只清** \`dpgen_work/*\` 与 \`~/.dpdispatcher/submission/\`（任务执行残留）

清这两个地方是为了：防止 stale 恢复循环，以及防止旧 \`model.ckpt\` 被误当 restart。

### 续跑语义

加 \`model_devi_jobs[N]\` 后重启，dpgen 从 record 续该 iter 的 \`make_model_devi\`，**探索落在 \`iter.N\` 名下**（不是 N+1），随后 \`iter.N+1\` 才 \`make_train\` 吃新 FP 数据。已完成的 task 会跳过，不会重训。

## 快速排查清单

\`\`\`bash
tmux ls && ps aux | grep "dpgen run" | grep -v grep   # 进程活着吗
tail -20 dpgen.log ; tail -5 record.dpgen              # 推进到哪一步
ls -lt dpgen_work/ | head                              # 当前任务（最新 hash）
tail -1 dpgen_work/*/lcurve.out                        # 训练实时进度
tail dpgen_work/<hash>/task.*/model_devi.out           # 探索实时进度
ls iter.*/02.fp/data.*                                 # 前一轮 FP 数据落盘了吗
\`\`\`
`,
    tags: ["dpgen", "续跑", "record.dpgen", "copy_model", "hash", "排查", "源码"],
    sourceFiles: ["dpgen-workflow-gotchas.md", "06-machine.json-资源并发与运行状态.md"],
  },
];
