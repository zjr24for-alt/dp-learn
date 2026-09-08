import { ModelDeviAnalyzer } from "@/components/diag/model-devi-analyzer";

export const metadata = {
  title: "model_devi 模型偏差分析器",
  description:
    "粘贴 model_devi.out，自动绘制 max_devi_f 随迭代变化、对照 f_trust 阈值判断主动学习是否该继续采样（DP-GEN）",
};

export default function ModelDeviPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-zinc-900 mb-2">🎯 model_devi 模型偏差分析器</h1>
      <p className="text-zinc-500 mb-6">
        粘贴 <code className="text-zinc-700 bg-zinc-100 px-1 py-0.5 rounded text-sm">model_devi.out</code>{" "}
        内容，绘制候选结构偏差分布，对照 f_trust 阈值判断模型是否可信、DP-GEN 主动学习是否该继续迭代。
        全部在浏览器本地完成。
      </p>

      <ModelDeviAnalyzer />
    </div>
  );
}
