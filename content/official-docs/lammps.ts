import type { DocEntry } from "@/lib/types";

export const lammpsDocs: DocEntry[] = [
  {
    id: "lammps-pair-deepmd",
    source: "lammps",
    title: "pair_style deepmd 命令",
    summary: "LAMMPS 中使用 DeePMD 势的 pair_style 语法和参数",
    content: `在 LAMMPS 中使用 DeePMD 势：

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
- OMP_NUM_THREADS 可控制 CPU 并行`,
    url: "https://docs.lammps.org/pair_deepmd.html",
    tags: ["lammps", "deepmd", "pair_style", "势函数"],
  },
  {
    id: "lammps-units-metal",
    source: "lammps",
    title: "LAMMPS metal units",
    summary: "DeePMD 训练使用 metal units，LAMMPS 中需要对应设置",
    content: `metal units 下各物理量的单位：
- 距离: Ångström (Å)
- 时间: picoseconds (ps)
- 能量: eV
- 力: eV/Å
- 压力: bars
- 质量: grams/mole
- 温度: Kelvin (K)

与 real units 的区别：real units 能量用 kcal/mol。

DeePMD 模型的输出单位是 eV 和 eV/Å，所以必须用 metal units。

【典型设置】
\`\`\`
units metal
timestep 0.001  # 1 fs
\`\`\``,
    url: "https://docs.lammps.org/units.html",
    tags: ["lammps", "units", "metal", "DeePMD"],
  },
  {
    id: "lammps-input-example",
    source: "lammps",
    title: "LAMMPS + DeePMD 完整输入示例",
    summary: "一个使用 DeePMD 势跑 NVT MD 的完整 LAMMPS input 脚本",
    content: `\`\`\`lammps
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
- fix nvt: Nosé-Hoover 恒温器
- thermo 100: 每 100 步输出一次热力学量
- dump: 每 100 步输出一次轨迹`,
    url: "https://docs.lammps.org/Howto_bash.html",
    tags: ["lammps", "deepmd", "input", "NVT", "MD"],
  },
  {
    id: "lammps-fix-nvt",
    source: "lammps",
    title: "fix nvt / npt 命令",
    summary: "恒温恒压控制方法，DP-GEN explore 阶段常用 NVT 和 NPT",
    content: `【fix nvt】恒温恒体积（NVT 系综）
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
- model_devi_skip 控制输出频率`,
    url: "https://docs.lammps.org/fix_nh.html",
    tags: ["lammps", "fix", "NVT", "NPT", "dpgen"],
  },
];
