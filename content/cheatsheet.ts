import type { CheatsheetItem } from "@/lib/types";

export const cheatsheetItems: CheatsheetItem[] = [
  // ====== 命令类 ======
  {
    id: "cmd-dpgen-run",
    category: "command",
    label: "启动 dpgen",
    description: "在项目目录下启动 dpgen 主动学习",
    code: "dpgen run param.json machine.json 2>&1 | tee -a dpgen.log",
    tags: ["dpgen", "启动"],
  },
  {
    id: "cmd-dp-train",
    category: "command",
    label: "DeePMD 训练",
    description: "使用 input.json 训练 DeePMD 模型",
    code: "dp train input.json",
    tags: ["deepmd", "训练"],
  },
  {
    id: "cmd-dp-freeze",
    category: "command",
    label: "冻结模型",
    description: "将 checkpoint 转为 .pb 文件",
    code: "dp freeze -o graph.pb",
    tags: ["deepmd", "模型导出"],
  },
  {
    id: "cmd-lmp-deepmd",
    category: "command",
    label: "LAMMPS + DeePMD",
    description: "使用 DeePMD 势的 LAMMPS 运行",
    code: "lmp -in input.lammps",
    tags: ["lammps", "deepmd"],
  },
  {
    id: "cmd-vasp-run",
    category: "command",
    label: "运行 VASP",
    description: "标准 VASP 运行命令（单节点）",
    code: "mpirun -np $NP /path/to/vasp_std > vasp.out 2>&1",
    tags: ["vasp", "mpi"],
  },
  {
    id: "cmd-qsub",
    category: "command",
    label: "提交 PBS 作业",
    description: "提交作业到超算 batch 队列",
    code: "qsub job.pbs",
    tags: ["pbs", "超算"],
  },
  {
    id: "cmd-qstat",
    category: "command",
    label: "查看作业状态",
    description: "查看当前用户在 PBS 队列中的作业",
    code: "qstat -u student2025",
    tags: ["pbs", "监控"],
  },
  {
    id: "cmd-qdel",
    category: "command",
    label: "删除作业",
    description: "从 PBS 队列中删除指定作业",
    code: "qdel 12345",
    tags: ["pbs", "运维"],
  },
  {
    id: "cmd-tail-log",
    category: "command",
    label: "查看最新日志",
    description: "查看 dpgen 日志最后 20 行",
    code: "tail -20 dpgen.log",
    tags: ["日志", "监控"],
  },
  {
    id: "cmd-grep-error",
    category: "command",
    label: "搜索日志报错",
    description: "在 dpgen 日志中搜索错误关键词",
    code: 'grep -iE "error|exception|killed|oom|segfault|traceback|failed" dpgen.log | tail -20',
    tags: ["日志", "调试"],
  },
  {
    id: "cmd-kill-all",
    category: "command",
    label: "停止所有 dpgen 进程",
    description: "一键杀掉训练+探索+标注",
    code: 'pkill -9 -f "dpgen run"; pkill -9 -f lmp; pkill -9 -f vasp; pkill -9 -f deepmd; pkill -9 -f "dp train"',
    tags: ["进程", "运维"],
  },
  {
    id: "cmd-scp-upload",
    category: "command",
    label: "上传文件到超算",
    description: "用 scp 上传到超算服务器的 dpgen 工作目录",
    code: "scp file student2025@10.157.197.40:/public/home/student2025/zhuangjingrun/dpgen_work/",
    tags: ["scp", "超算", "传输"],
  },
  {
    id: "cmd-conda-activate",
    category: "command",
    label: "激活 conda 环境",
    description: "训练用 deepmd，dpgen 用 deepmd2",
    code: "conda activate deepmd2  # dpgen\nconda activate deepmd   # train",
    tags: ["conda", "环境"],
  },

  // ====== 参数类 ======
  {
    id: "param-trust-lo",
    category: "param",
    label: "model_devi_f_trust_lo",
    description: "力偏差下界（eV/Å），低于此值认为模型准确",
    code: '"model_devi_f_trust_lo": 0.05',
    tags: ["dpgen", "信任度"],
  },
  {
    id: "param-trust-hi",
    category: "param",
    label: "model_devi_f_trust_hi",
    description: "力偏差上界（eV/Å），高于此值触发 VASP 标注",
    code: '"model_devi_f_trust_hi": 0.35',
    tags: ["dpgen", "信任度"],
  },
  {
    id: "param-numb-models",
    category: "param",
    label: "numb_models",
    description: "Committee 模型数量，通常为 4",
    code: '"numb_models": 4',
    tags: ["dpgen", "训练"],
  },
  {
    id: "param-numb-steps",
    category: "param",
    label: "numb_steps",
    description: "每轮训练的总步数",
    code: '"numb_steps": 400000',
    tags: ["deepmd", "训练"],
  },
  {
    id: "param-rcut",
    category: "param",
    label: "rcut / rcut_smth",
    description: "截断半径与平滑截断起点（Å）",
    code: '"rcut": 6.5,\n"rcut_smth": 5.0',
    tags: ["deepmd", "descriptor"],
  },
  {
    id: "param-sel",
    category: "param",
    label: "sel (近邻数)",
    description: "每种元素的截断半径内最大近邻原子数",
    code: '"sel": [40, 40]',
    tags: ["deepmd", "descriptor"],
  },
  {
    id: "param-fp-task-max",
    category: "param",
    label: "fp_task_max / fp_task_min",
    description: "每轮最多/最少 VASP 标注数",
    code: '"fp_task_max": 50,\n"fp_task_min": 1',
    tags: ["dpgen", "fp"],
  },

  // ====== 路径类 ======
  {
    id: "path-local-dp-train",
    category: "path",
    label: "dp (训练)",
    description: "deepmd 环境中的 dp 可执行文件",
    code: "/home/kobe/miniconda3/envs/deepmd/bin/dp",
    tags: ["deepmd", "本地路径"],
  },
  {
    id: "path-local-dpgen",
    category: "path",
    label: "dpgen",
    description: "deepmd2 环境中的 dpgen 可执行文件",
    code: "/home/kobe/miniconda3/envs/deepmd2/bin/dpgen",
    tags: ["dpgen", "本地路径"],
  },
  {
    id: "path-local-lmp",
    category: "path",
    label: "lmp (DeePMD版)",
    description: "deepmd 环境中的 LAMMPS",
    code: "/home/kobe/miniconda3/envs/deepmd/bin/lmp",
    tags: ["lammps", "本地路径"],
  },
  {
    id: "path-hpc-vasp",
    category: "path",
    label: "vasp_std (超算)",
    description: "超算上的 VASP 可执行文件",
    code: "/public/software/vasp.5.4.4/bin/vasp_std",
    tags: ["vasp", "超算路径"],
  },
  {
    id: "path-hpc-intel",
    category: "path",
    label: "Intel 环境 (超算)",
    description: "超算 Intel 编译环境初始化脚本",
    code: "source /public/software/intel2020u2/intel2020u2_env.sh",
    tags: ["超算路径", "环境"],
  },
  {
    id: "path-hpc-work",
    category: "path",
    label: "dpgen 工作目录 (超算)",
    description: "超算上 dpgen 的 remote_root",
    code: "/public/home/student2025/zhuangjingrun/dpgen_work/",
    tags: ["dpgen", "超算路径"],
  },
  {
    id: "path-local-project",
    category: "path",
    label: "项目根目录",
    description: "TiC MLP 项目的本地根目录",
    code: "~/vasp_run/TiC_MLP/",
    tags: ["项目", "本地路径"],
  },

  // ====== 脚本类 ======
  {
    id: "script-clean-startup",
    category: "script",
    label: "干净环境启动",
    description: "避免 conda 污染 VASP 动态库的启动脚本",
    code: `#!/bin/bash
source /home/kobe/miniconda3/etc/profile.d/conda.sh
conda activate dpgen_test_env
unset LD_LIBRARY_PATH
export PATH=/home/kobe/miniconda3/envs/dpgen_test_env/bin:/usr/local/bin:/usr/bin:/bin
dpgen run param.json machine.json`,
    tags: ["启动", "脚本", "环境"],
  },
  {
    id: "script-watch-dpgen",
    category: "script",
    label: "dpgen 监控脚本",
    description: "每30秒检查进程存活+报错扫描+进度显示",
    code: `#!/bin/bash
while true; do
  pgrep -f "dpgen run" > /dev/null && echo "✅ running" || echo "❌ dead"
  tail -100 dpgen.log | grep -iE "error|failed" | tail -5
  sleep 30
done`,
    tags: ["监控", "脚本", "dpgen"],
  },

  // ====== OVITO / 可视化 ======
  {
    id: "cmd-ovito-python",
    category: "command",
    label: "OVITO Python 管线",
    description: "导入 LAMMPS dump 并进行 PTM 结构分析",
    code: "from ovito.io import import_file\nfrom ovito.modifiers import PolyhedralTemplateMatchingModifier\n\npipeline = import_file('dump.lammpstrj')\npipeline.modifiers.append(PolyhedralTemplateMatchingModifier())",
    tags: ["ovito", "python", "PTM"],
  },
  {
    id: "cmd-ovito-dxa",
    category: "command",
    label: "DXA 位错分析",
    description: "Python 脚本做位错提取与密度统计",
    code: "from ovito.modifiers import DislocationAnalysisModifier\n\npipeline.modifiers.append(DislocationAnalysisModifier())\ndata = pipeline.compute()\nL = data.attributes['DislocationAnalysis.total_line_length']\nV = data.attributes['DislocationAnalysis.cell_volume']\nprint(f'Dislocation density: {L/V:.3e} A^-2')",
    tags: ["ovito", "DXA", "位错"],
  },
  {
    id: "cmd-ovito-tachyon",
    category: "command",
    label: "Tachyon 高质量渲染",
    description: "使用 OVITO Tachyon 渲染发表级图像",
    code: "from ovito.vis import Viewport, TachyonRenderer\n\nvp = Viewport(type=Viewport.Type.Perspective)\nvp.render_image(size=(1920,1080), filename='render.png',\n  renderer=TachyonRenderer(ambient_occlusion=True, shadows=True))",
    tags: ["ovito", "渲染", "Tachyon"],
  },

  // ====== ASE / 结构操作 ======
  {
    id: "cmd-ase-build",
    category: "command",
    label: "ASE 构建超胞/表面",
    description: "用 ASE 创建晶体结构、切表面、做超胞",
    code: "from ase.build import bulk, fcc111, make_supercell\n\ncu = bulk('Cu', 'fcc', a=3.61)\ncu_sc = cu * (3, 3, 3)  # 超胞\ncu111 = fcc111('Cu', a=3.61, size=(2,2,4), vacuum=10.0)  # 表面",
    tags: ["ase", "结构", "表面"],
  },
  {
    id: "cmd-ase-relax",
    category: "command",
    label: "ASE 结构弛豫",
    description: "对接 VASP/GPAW 做 BFGS 弛豫",
    code: "from ase.optimize import BFGS\nfrom ase.calculators.vasp import Vasp\n\natoms.calc = Vasp(xc='PBE', encut=500, kpts=(4,4,1), directory='relax')\nopt = BFGS(atoms)\nopt.run(fmax=0.02)  # eV/A",
    tags: ["ase", "弛豫", "DFT"],
  },

  // ====== LAMMPS / MD ======
  {
    id: "cmd-lmp-npt",
    category: "command",
    label: "LAMMPS NPT 分子动力学",
    description: "等温等压系综 MD 运行（含弛豫）",
    code: "units metal\ntimestep 0.001\nvelocity all create 300 12345\nfix npt all npt temp 300 300 0.1 iso 0 0 1.0\nrun 100000",
    tags: ["lammps", "NPT", "MD"],
  },
  {
    id: "cmd-lmp-minimize",
    category: "command",
    label: "LAMMPS 能量最小化",
    description: "MD 前先做能量最小化消除坏接触",
    code: "minimize 1.0e-10 1.0e-10 10000 100000",
    tags: ["lammps", "最小化", "MD"],
  },

  // ====== DFT 收敛参数 ======
  {
    id: "param-encut-convergence",
    category: "param",
    label: "ENCUT 截断能",
    description: "PBE 泛函推荐 ENCUT = 1.3 × max(ENMAX)，弹性常数建议 1.5×",
    code: 'ENCUT = 500  # 1.3 × ENMAX\n# 收敛测试: for ENCUT in 300 400 500 600',
    tags: ["dft", "encut", "收敛"],
  },
  {
    id: "param-kpoint-density",
    category: "param",
    label: "K 点密度",
    description: "k_i × a_i ≈ 30-40 Å 为精确计算，能带用高对称路径，DOS 加密 2-3×",
    code: "# vaspkit -task 102 生成 KPOINTS\n# 输入密度 ~0.04 (精确) 或 ~0.03 (DOS)",
    tags: ["dft", "kpoints", "收敛"],
  },
  {
    id: "param-smearing",
    category: "param",
    label: "ISMEAR / SIGMA",
    description: "半导体 ISMEAR=0, SIGMA=0.05；金属 ISMEAR=1；能带/DOS 用 ISMEAR=-5 (四面体)",
    code: "ISMEAR = 0    # 半导体: Gaussian\nSIGMA = 0.05\nISMEAR = 1    # 金属: Methfessel-Paxton\nISMEAR = -5   # DOS/能带: 四面体方法",
    tags: ["dft", "smearing", "VASP"],
  },
];
