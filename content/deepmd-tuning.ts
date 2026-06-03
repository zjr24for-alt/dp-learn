import type { Article } from "@/lib/types";

/** 来源: deepmodeling/deepmd-kit doc/troubleshooting + doc/model */
export const deepmdTuningArticles: Article[] = [
  {
    slug: "net-size-tuning",
    title: "网络大小调优：fitting_net 与 embedding_net 的精度-速度权衡",
    category: "deepmd-training",
    summary: "基于官方 benchmark 数据，不同 fitting_net/embedding_net 大小对 Al₂O₃、Cu、H₂O 体系精度的影响",
    tags: ["deepmd", "网络大小", "fitting_net", "embedding_net", "调优", "benchmark"],
    sourceFiles: ["deepmodeling/deepmd-kit/doc/troubleshooting/howtoset_netsize.md"],
    content: `# 网络大小调优指南

## 核心结论

1. **fitting_net 对精度影响较小**：从 [240,240,240] 缩小到 [20,20,20]，力 RMSE 仅增加 2-5%
2. **embedding_net 对精度影响很大**：从 [25,50,100] 缩小到 [4,8,16]，力 RMSE 可能增加 50-100%
3. **推荐策略**：embedding_net 不要太小，fitting_net 可以适当缩小以节省计算

## 官方 Benchmark 数据

### Al₂O₃ 体系（embedding_net: [25,50,100]）

| fitting_net | 能量 RMSE (eV/atom) | 力 RMSE (eV/Å) |
|-------------|---------------------|-----------------|
| [240,240,240] | 7.26e-05 | 0.040 |
| [80,80,80] | 7.50e-05 | 0.040 |
| [20,20,20] | 7.64e-05 | 0.041 |
| [10,10,10] | 7.97e-05 | 0.042 |
| [5,5,5] | 8.05e-05 | 0.042 |
| [] (线性) | 1.31e-04 | 0.054 |

> **解读**：fitting_net 从 [240,240,240] 缩到 [20,20,20]，力 RMSE 仅从 0.040 增到 0.041 eV/Å，几乎无差别。但去掉隐藏层（线性回归）精度显著下降。

### Al₂O₃ 体系（fitting_net: [240,240,240]）

| embedding_net | 能量 RMSE (eV/atom) | 力 RMSE (eV/Å) |
|---------------|---------------------|-----------------|
| [25,50,100] | 7.26e-05 | 0.040 |
| [10,20,40] | 1.21e-04 | 0.047 |
| [5,10,20] | 1.40e-04 | 0.057 |
| [4,8,16] | 2.53e-04 | 0.073 |
| [2,4,8] | 2.20e-04 | 0.075 |
| [1,2,4] | 5.43e-04 | 0.097 |

> **解读**：embedding_net 从 [25,50,100] 缩到 [4,8,16]，力 RMSE 从 0.040 增到 0.073 eV/Å，增加 82%！embedding_net 是精度的关键。

### Cu 体系

| fitting_net | 力 RMSE (eV/Å) | embedding_net | 力 RMSE (eV/Å) |
|-------------|----------------|---------------|----------------|
| [240,240,240] | 0.089 | [25,50,100] | 0.089 |
| [20,20,20] | 0.090 | [10,20,40] | 0.090 |
| [10,10,10] | 0.090 | [5,10,20] | 0.090 |
| [] (线性) | 0.090 | [4,8,16] | 0.095 |

> **解读**：Cu 体系 fitting_net 几乎无影响（变化 <1%），但 embedding_net 缩小到 [4,8,16] 时精度开始明显下降。

### H₂O 体系

| fitting_net | 力 RMSE (eV/Å) | embedding_net | 力 RMSE (eV/Å) |
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
`,
  },
  {
    slug: "lcurve-out-guide",
    title: "lcurve.out 训练曲线解读与异常诊断",
    category: "deepmd-training",
    summary: "lcurve.out 各列含义、正常/异常曲线形态、常见训练问题的诊断方法",
    tags: ["deepmd", "lcurve", "训练曲线", "诊断", "loss"],
    sourceFiles: ["deepmodeling/deepmd-kit/doc/train/training.md"],
    content: `# lcurve.out 训练曲线解读

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
| rmse_f_val | 验证集力 RMSE | eV/Å |
| rmse_f_trn | 训练集力 RMSE | eV/Å |
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
- **原因**：数据中有异常帧（力 > 50 eV/Å）
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
ax1.set_xlabel("Step"); ax1.set_ylabel("Force RMSE (eV/Å)")
ax1.set_yscale("log"); ax1.legend(); ax1.grid()

# 能量 RMSE
ax2.plot(data["step"], data["rmse_e_val"], label="val")
ax2.plot(data["step"], data["rmse_e_trn"], label="trn", alpha=0.7)
ax2.set_xlabel("Step"); ax2.set_ylabel("Energy RMSE (eV/atom)")
ax2.set_yscale("log"); ax2.legend(); ax2.grid()

plt.tight_layout(); plt.savefig("lcurve.png", dpi=150); plt.show()
\`\`\`
`,
  },
  {
    slug: "dpgen-troubleshooting",
    title: "DP-GEN 常见错误与排查清单",
    category: "dpgen-workflow",
    summary: "基于官方文档整理的 DP-GEN 常见报错、原因分析与解决方案",
    tags: ["dpgen", "报错", "排查", "troubleshooting", "错误"],
    sourceFiles: ["deepmodeling/dpgen/doc/user-guide/common-errors.md", "deepmodeling/dpgen/doc/user-guide/troubleshooting.md"],
    content: `# DP-GEN 常见错误与排查清单

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
  - ENCUT 是否足够（≥ 1.3 × ENMAX）
  - 是否被 conda 的 LD_LIBRARY_PATH 污染
`,
  },
];
