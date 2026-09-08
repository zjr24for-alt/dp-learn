import Link from "next/link";
import { CodeBlock } from "@/components/code-block";

export const metadata = {
  title: "从零训练 Cu 势函数（端到端示例）",
  description:
    "从环境安装、数据准备到训练、测试、冻结、LAMMPS/ASE 使用的最小闭环，20 分钟跑通 DeePMD 势函数训练全流程",
};

const INPUT_JSON = `{
  "model": {
    "type_map": ["Cu"],
    "descriptor": {
      "type": "se_e2_a",
      "rcut": 6.0,
      "rcut_smth": 0.5,
      "sel": [40],
      "neuron": [25, 50, 100]
    },
    "fitting_net": {
      "neuron": [240, 240, 240]
    }
  },
  "learning_rate": {
    "type": "exp",
    "decay_steps": 5000,
    "start_lr": 0.001,
    "decay_rate": 0.95
  },
  "loss": {
    "type": "ener",
    "start_pref_e": 0.02,
    "limit_pref_e": 1,
    "start_pref_f": 1000,
    "limit_pref_f": 1,
    "start_pref_v": 0.0,
    "limit_pref_v": 0.0
  },
  "training": {
    "seed": 2026,
    "numb_steps": 400000,
    "batch_size": 4,
    "disp_freq": 1000,
    "save_freq": 10000
  }
}`;

const DATA_CONVERT = `# 方法一：dpdata 把 VASP OUTCAR 转成 DeePMD 格式（推荐从少量结构开始）
# 安装：pip install dpdata  或  在 deepmd 环境内已自带
python << 'EOF'
import dpdata
import glob

# 把每个 OUTCAR 目录下的结构都读进来（也可以只用一个 OUTCAR 试跑）
frames = []
for f in glob.glob("OUTCAR*"):
    s = dpdata.System(f, fmt="vasp/outcar")
    frames.append(s)

data = dpdata.LabeledSystem("OUTCAR", fmt="vasp/outcar")
# 切分：80% 训练 / 20% 测试（至少留一个结构测试）
n = len(data)
train, test = data[: int(n * 0.8)], data[int(n * 0.8):]
train.to("deepmd/npy", "data/train")
test.to("deepmd/npy", "data/test")
print(f"train {len(train)} frames, test {len(test)} frames")
EOF`;

const TRAIN_CMD = `# 训练（GPU 上 40 万步约数小时；先跑 5000 步验证流程）
dp train input.json

# 训练过程中实时查看损失曲线：
#   打开本站工具 → 粘贴 lcurve.out → 自动诊断
#   tail -f lcurve.out`;

const TEST_CMD = `# 测试：对测试集评估能量/力精度
dp test -m frozen_model.pb -s data/test -n 100

# 期望输出（合理水平）：
#   rmse_e  < 0.02 eV/atom
#   rmse_f  < 0.10 eV/A`;

const FREEZE_CMD = `# 冻结为单文件模型（推理/部署用）
dp freeze -o frozen_model.pb

# （可选）压缩，减小体积提升速度
# dp compress -i frozen_model.pb -o compress.pb`;

const LAMMPS_USE = `# LAMMPS in.lmp：加载 DP 势函数
pair_style deepmd frozen_model.pb
pair_coeff * *

# 然后正常写模拟（温度、系综等）即可`;

const ASE_USE = `from deepmd.calculator import DP
from ase.io import read
from ase.optimize import BFGS

calc = DP(model="frozen_model.pb")
atoms = read("POSCAR")
atoms.calc = calc

# 结构弛豫
opt = BFGS(atoms)
opt.run(fmax=0.01)
print("能量:", atoms.get_potential_energy(), "eV")`;

const ENV_CMD = `# 推荐：conda 环境（CPU 版足够学流程）
conda create -n deepmd deepmd-kit -c conda-forge

# GPU 版（按你的 CUDA 版本选择 cuda12 或 cuda11）
# conda create -n deepmd deepmd-kit libdeepmd=*=cuda12* -c conda-forge

conda activate deepmd
dp --version   # 确认安装成功`;

export default function TutorialPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-zinc-900 mb-2">🚀 从零训练 Cu 势函数（端到端示例）</h1>
      <p className="text-zinc-500 mb-8">
        一个最小可跑通的 DeePMD 训练闭环：环境 → 数据 → 训练 → 诊断 → 测试 → 冻结 → 使用。
        按顺序执行即可，全部命令可一键复制。完整概念讲解见知识库对应文章。
      </p>

      <Step n={1} title="准备环境" detail="用 conda 创建 DeePMD-kit 环境（学习流程 CPU 版就够）。">
        <CodeBlock lang="bash" code={ENV_CMD} />
        <Hint>
          遇到 conda 装不上的问题，查知识库文章《DeePMD 快速上手》或官方安装文档。
        </Hint>
      </Step>

      <Step n={2} title="准备数据" detail="把 DFT 计算（VASP OUTCAR）转成 DeePMD 训练格式。先用少量结构试跑，再扩充。">
        <CodeBlock lang="python" code={DATA_CONVERT} />
        <Hint>
          数据是势函数精度的根本——详见知识库《dpdata 数据转换》与《数据回流：OUTCAR → set.xxx》。
          生成后目录结构应为 <code className="bg-zinc-100 px-1 rounded text-xs">data/train/type.raw + set.xxx/</code>。
        </Hint>
      </Step>

      <Step n={3} title="写 input.json" detail="最小训练配置（单元素 Cu，se_e2_a 描述符）。">
        <CodeBlock lang="json" code={INPUT_JSON} />
        <Hint>
          想可视化配置项、校验合法性？用{" "}
          <Link href="/config-builder" className="text-indigo-600 hover:underline">配置构建器</Link>。
          注意 <code className="bg-zinc-100 px-1 rounded text-xs">sel</code> 需 ≥ 训练集中任意原子的最大邻居数（此处 40 为示例，偏小会报错，改大即可）。
        </Hint>
      </Step>

      <Step n={4} title="训练" detail="先跑少量步数验证流程，再跑完整训练。">
        <CodeBlock lang="bash" code={TRAIN_CMD} />
        <Hint>
          训练中如何判断好不好？把 <code className="bg-zinc-100 px-1 rounded text-xs">lcurve.out</code> 粘贴进{" "}
          <Link href="/lcurve" className="text-indigo-600 hover:underline">📈 lcurve 训练诊断器</Link>
          ，自动画曲线并诊断发散 / 过拟合 / 收敛性。判定标准详见知识库《lcurve.out 训练曲线解读》。
        </Hint>
      </Step>

      <Step n={5} title="测试" detail="用冻结前的 checkpoint 或冻结后的模型评估精度。">
        <CodeBlock lang="bash" code={TEST_CMD} />
        <Hint>
          力 RMSE &lt; 0.1 eV/Å 对大多数材料已可用；&lt; 0.05 更好。不同体系阈值不同，参考论文常见水平。
        </Hint>
      </Step>

      <Step n={6} title="冻结 / 压缩" detail="把训练模型固化为单文件，便于部署与推理。">
        <CodeBlock lang="bash" code={FREEZE_CMD} />
      </Step>

      <Step n={7} title="使用：LAMMPS / ASE" detail="加载冻结模型做分子动力学或结构弛豫。">
        <CodeBlock lang="lammps" code={LAMMPS_USE} />
        <CodeBlock lang="python" code={ASE_USE} />
        <Hint>
          LAMMPS 集成的报错排查见知识库《LAMMPS + DeePMD 集成》；ASE 用法见《ASE 构建超胞/表面》。
        </Hint>
      </Step>

      <Step n={8} title="调参循环" detail="训练不是一次成功——看曲线、找原因、改配置、重训。">
        <div className="text-sm text-zinc-600 leading-relaxed">
          典型循环：
          <ol className="list-decimal ml-5 mt-2 space-y-1">
            <li>用 <Link href="/lcurve" className="text-indigo-600 hover:underline">lcurve 诊断器</Link> 定位问题（发散 / 不收敛 / 过拟合 / 精度不足）</li>
            <li>按诊断建议改配置（学习率、网络大小、数据、损失权重），参考《DeePMD 训练参数详解》与《网络大小调优》</li>
            <li>重训后再诊断，对比两次曲线</li>
          </ol>
          <p className="mt-2">追求更高精度或探索未知体系时，进入主动学习闭环——见知识库《DP 势函数生成完整流程》与 <Link href="/dpgen-sop" className="text-indigo-600 hover:underline">DP-GEN 标准流程</Link>。</p>
        </div>
      </Step>

      <div className="mt-8 p-4 bg-zinc-50 rounded-xl border border-zinc-200 text-sm text-zinc-600">
        ⚠️ 本示例为教学用途的最小配置：单一元素、少量数据、未调优。真实研究请结合体系特性配置描述符、扩充数据并做充分验证。
      </div>
    </div>
  );
}

function Step({
  n,
  title,
  detail,
  children,
}: {
  n: number;
  title: string;
  detail: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="flex items-start gap-3 mb-3">
        <span className="shrink-0 w-7 h-7 rounded-full bg-indigo-600 text-white text-sm font-semibold flex items-center justify-center">
          {n}
        </span>
        <div>
          <h2 className="text-lg font-bold text-zinc-900 leading-7">{title}</h2>
          <p className="text-sm text-zinc-500">{detail}</p>
        </div>
      </div>
      <div className="ml-10">{children}</div>
    </section>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-zinc-500 mb-4 leading-relaxed">💡 {children}</p>;
}
