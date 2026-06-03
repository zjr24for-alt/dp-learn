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
    summary: "将训练 checkpoint 导出为 .pb/.pth 文件用于推理",
    content: `dp freeze 命令用于将训练产生的 checkpoint 导出为单一的模型文件。

TensorFlow 后端：dp freeze -o model.pb
PyTorch 后端：dp --pt freeze -o model.pth

选项：
- -o: 输出文件名
- --united-model: 导出单个统一模型
- --iteration: 指定 checkpoint 步数
- --head: 多任务训练时指定 head

模型压缩（推荐生产环境使用）：
dp compress -i model.pb -o model-compressed.pb
dp --pt compress -i model.pth -o model-compressed.pth
压缩使用五阶多项式查表 + 算子合并，可获得 2-4x 加速，精度损失极小`,
    url: "https://docs.deepmodeling.com/projects/deepmd/en/latest/operation/freeze.html",
    tags: ["deepmd", "dp freeze", "模型导出", "compress", "压缩"],
  },
  {
    id: "deepmd-sel-determination",
    source: "deepmd",
    title: "如何确定 sel 参数：dp neighbor-stat",
    summary: "用 neighbor-stat 命令统计训练数据的最大近邻数，科学确定 sel 值",
    content: `sel 参数设定截断半径内每种原子的最大近邻数。

确定方法：
1. 运行 dp neighbor-stat 统计训练数据
   dp --pt neighbor-stat -s data -r 6.0 -t O H
   输出 max_nbor_size: [38, 72]
   含义：O 最多38个近邻，H 最多72个近邻

2. sel 应设为比统计值更高的值（留余量给 MD 极端构型）
   如统计值 [38, 72]，建议设 sel: [46, 92]

注意事项：
- sel 太小：能量不守恒，精度下降
- sel 太大：计算变慢，内存增加
- rcut 没有半盒子大小限制（DeePMD 自动处理 PBC 镜像）`,
    url: "https://docs.deepmodeling.com/projects/deepmd/en/latest/model/sel.html",
    tags: ["deepmd", "sel", "近邻数", "neighbor-stat"],
  },
  {
    id: "deepmd-pretrained-models",
    source: "deepmd",
    title: "预训练大模型：DPA-2/DPA-3",
    summary: "使用 dp pretrained 下载官方预训练大模型，可直接推理或微调",
    content: `DeePMD-kit 提供预训练大模型（DPA-2/DPA-3 系列），可直接使用或微调。

下载命令：
dp pretrained download DPA-3.3-1M
dp pretrained download DPA-3.2-5M
dp pretrained download DPA-3.1-3M

Python 中使用（自动下载）：
from deepmd.infer import DeepPot
pot = DeepPot("DPA-3.2-5M")

DPA-2 特点：
- 基于 attention 的描述符架构
- 三通道：单原子通道 + 旋转不变对通道 + 旋转等变对通道
- 支持多任务预训练
- 精度高于传统 se_e2_a`,
    url: "https://docs.deepmodeling.com/projects/deepmd/en/latest/model/pretrained.html",
    tags: ["deepmd", "DPA-2", "DPA-3", "预训练", "pretrained"],
  },
  {
    id: "deepmd-lcurve-guide",
    source: "deepmd",
    title: "lcurve.out 训练曲线解读",
    summary: "训练输出的 lcurve.out 文件各列含义：step, rmse_val/trn, rmse_e, rmse_f, lr",
    content: `lcurve.out 是 DeePMD-kit 训练过程中输出的学习曲线文件。

列含义（从左到右）：
1. step: 训练步数
2. rmse_val: 验证集总损失
3. rmse_trn: 训练集总损失
4. rmse_e_val: 验证集能量 RMSE (eV/atom, 按原子数归一化)
5. rmse_e_trn: 训练集能量 RMSE
6. rmse_f_val: 验证集力 RMSE (eV/Å)
7. rmse_f_trn: 训练集力 RMSE
8. lr: 当前学习率

正常训练特征：
- loss 持续下降
- val 和 trn 的 loss 接近
- loss_f 最终 < 0.1 eV/Å

异常情况：
- loss 震荡 → 学习率太大
- loss 跳高 → 数据有异常帧
- val >> trn → 过拟合`,
    url: "https://docs.deepmodeling.com/projects/deepmd/en/latest/train/training.html",
    tags: ["deepmd", "lcurve", "训练曲线", "loss"],
  },
];
