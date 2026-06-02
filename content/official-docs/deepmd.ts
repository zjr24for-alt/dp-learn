import type { DocEntry } from "@/lib/types";

export const deepmdDocs: DocEntry[] = [
  {
    id: "deepmd-install",
    source: "deepmd",
    title: "DeePMD-kit 安装指南",
    summary: "DeePMD-kit 的 conda/pip/源码安装方法，支持 TensorFlow 和 PyTorch 后端",
    content: `DeePMD-kit 支持通过 conda、pip 和源码三种方式安装。
推荐使用 conda 安装以获取预编译的 GPU 支持：
conda create -n deepmd deepmd-kit=*=*gpu libdeepmd=*=*gpu lammps-dp -c https://conda.deepmodeling.com
安装后验证：dp --version`,
    url: "https://docs.deepmodeling.com/projects/deepmd/en/latest/getting-started/install.html",
    tags: ["deepmd", "安装", "conda", "GPU"],
  },
  {
    id: "deepmd-input-json",
    source: "deepmd",
    title: "input.json 训练参数完整参考",
    summary: "DeePMD 训练的 input.json 所有参数说明，包括 model/descriptor/fitting_net/loss/lr 等",
    content: `input.json 是 DeePMD 训练的核心配置文件。主要段：
- model: 模型配置，含 descriptor（描述符）和 fitting_net（拟合网络）
- learning_rate: 学习率策略（exp/cosine/阶梯衰减）
- loss: 损失函数权重（能量/力/virial 的 pref）
- training: 训练参数（numb_steps, seed, disp_file 等）

Descriptor 类型选择：
- se_e2_a: 最常用，适合大多数体系
- se_e3: 含三角特征，精度更高但更慢
- hybrid: 混合多个 descriptor`,
    url: "https://docs.deepmodeling.com/projects/deepmd/en/latest/training/train-input.html",
    tags: ["deepmd", "input.json", "训练参数", "descriptor"],
  },
  {
    id: "deepmd-committee",
    source: "deepmd",
    title: "DP-GEN 主动学习原理",
    summary: "DP-GEN 使用 committee model + model deviation 来筛选需要 DFT 标注的构型",
    content: `DP-GEN 的主动学习流程：
1. 用初始 DFT 数据训练 4 个独立模型（不同随机种子）
2. 用 LAMMPS 做 MD 探索构型空间
3. 计算 model deviation（4 个模型间的力标准差）
4. 偏差大的构型 → 送 VASP 标注
5. 新标注数据加入训练集 → 重新训练 → 循环

收敛判据：candidate 比例 < 某阈值（通常 5%），
或 accurate 比例 > 某阈值（通常 80%）`,
    url: "https://docs.deepmodeling.com/projects/dpgen/en/latest/theory.html",
    tags: ["dpgen", "主动学习", "committee", "model_devi"],
  },
  {
    id: "deepmd-v2-vs-v3",
    source: "deepmd",
    title: "DeePMD-kit v2 vs v3 差异",
    summary: "v3 引入 PyTorch 后端、改进的 descriptor、更好的 GPU 利用率",
    content: `DeePMD-kit v3 相比 v2 的主要变化：
- 新增 PyTorch 后端（同时保留 TensorFlow 后端）
- 改进的 se_e2_a descriptor 实现
- 更好的多 GPU 训练支持
- 与 dpgen v0.13+ 的兼容性改进
- 训练速度提升（尤其在大体系上）

注意：dpgen run 对 DeePMD-kit 版本敏感，建议用 dpgen 推荐版本`,
    url: "https://docs.deepmodeling.com/projects/deepmd/en/latest/releases.html",
    tags: ["deepmd", "版本", "v2", "v3"],
  },
  {
    id: "deepmd-freeze",
    source: "deepmd",
    title: "模型冻结：dp freeze",
    summary: "将训练 checkpoint 导出为 .pb 文件用于推理",
    content: `dp freeze 命令用于将训练产生的 checkpoint 导出为单一的 .pb 文件。
基本用法：dp freeze -o graph.pb
选项：
- -o: 输出文件名
- --united-model: 导出单个统一模型
- --iteration: 指定 checkpoint 步数

.pb 文件可用于：
- LAMMPS pair_style deepmd
- dp test / dp compress
- dpgen 的 model_devi 阶段`,
    url: "https://docs.deepmodeling.com/projects/deepmd/en/latest/operation/freeze.html",
    tags: ["deepmd", "dp freeze", "模型导出", ".pb"],
  },
];
