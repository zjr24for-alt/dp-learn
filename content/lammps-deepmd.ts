import type { Article } from "@/lib/types";

/** 来源: LAMMPS 官方 + deepmodeling 社区 + 实战经验 */
export const lammpsDeepmdArticles: Article[] = [
  {
    slug: "lammps-deepmd-integration",
    title: "LAMMPS + DeePMD 集成：配置、运行与排错",
    category: "deepmd-training",
    summary: "在 LAMMPS 中使用 DP 势函数的完整配置、常见报错排查和性能优化技巧",
    tags: ["LAMMPS", "DeePMD", "pair_style", "势函数", "MD"],
    sourceFiles: ["deepmodeling/deepmd-kit", "lammps.org"],
    content: `# LAMMPS + DeePMD 集成

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
units           metal          # DeePMD 输出 eV, Å, fs，必须用 metal!
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
| 长度 | Å | Å |
| 能量 | eV | kcal/mol |
| 时间 | ps | fs |
| 压强 | bar | atm |
| 力 | eV/Å | kcal/(mol·Å) |

**关键**：DeePMD 模型输出的是 eV 和 Å，所以 LAMMPS 必须用 \`units metal\`！

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
- **原因 A**：原子距离过近（< 1 Å），导致力无限大
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
| 大批量 MD | 多个独立 trajectory 并行跑 | 线性加速 |`,
  },
];
