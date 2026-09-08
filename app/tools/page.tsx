import Link from "next/link";

export const metadata = {
  title: "学习工具",
  description: "lcurve 训练诊断、model_devi 偏差分析、从零训练 Cu 势函数教程、DP-GEN 配置构建器等学习工具",
};

const TOOLS = [
  {
    href: "/lcurve",
    icon: "📈",
    title: "lcurve 训练诊断器",
    desc: "粘贴 lcurve.out，自动绘制损失曲线并诊断发散 / 过拟合 / 收敛性，给出调参建议",
  },
  {
    href: "/model-devi",
    icon: "🎯",
    title: "model_devi 偏差分析器",
    desc: "粘贴 model_devi.out，对照 f_trust 阈值判断模型是否可信、主动学习是否该继续",
  },
  {
    href: "/tutorial",
    icon: "🚀",
    title: "从零训练 Cu 势函数",
    desc: "环境 → 数据 → 训练 → 诊断 → 测试 → 部署的最小闭环，全部命令一键复制",
  },
  {
    href: "/config-builder",
    icon: "🔧",
    title: "DP-GEN 配置构建器",
    desc: "INCAR / param.json / machine.json 的可视化配置与 JSON Schema 校验",
  },
  {
    href: "/dpgen-sop",
    icon: "🧭",
    title: "DP-GEN 标准流程 (SOP)",
    desc: "按阶段推进的 DP-GEN 工作流清单，标注各阶段所需文件",
  },
  {
    href: "/cheatsheet",
    icon: "📋",
    title: "命令速查表",
    desc: "DeePMD / LAMMPS / Slurm / dpdata / VASP 常用命令与参数速查",
  },
];

export default function ToolsPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-zinc-900 mb-2">🧰 学习工具</h1>
      <p className="text-zinc-500 mb-8">
        围绕「训练 → 诊断 → 调参」学习闭环的工具集合，全部在浏览器本地运行。
      </p>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TOOLS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="border border-zinc-200 rounded-xl p-5 bg-white hover:shadow-lg hover:border-zinc-300 hover:-translate-y-0.5 transition-all duration-200 group"
          >
            <div className="text-2xl mb-2">{t.icon}</div>
            <h2 className="font-semibold text-zinc-900 mb-1 group-hover:text-zinc-600 transition-colors">
              {t.title}
            </h2>
            <p className="text-sm text-zinc-500 leading-relaxed">{t.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
