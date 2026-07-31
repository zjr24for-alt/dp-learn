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
grep "failed frame\|failed tasks" ~/C_deepmd_workflow/04_dpgen/dpgen.log | tail -10
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
`,
    tags: ["dpgen", "model_devi", "candidate", "信任度", "调参"],
    sourceFiles: ["dpgen常用检查指令.txt"],
  },
];
