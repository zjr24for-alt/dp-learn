import { LcurveAnalyzer } from "@/components/diag/lcurve-analyzer";

export const metadata = {
  title: "lcurve.out 训练诊断器",
  description:
    "粘贴 lcurve.out 训练日志，自动绘制 E/F/V 损失曲线并诊断发散、过拟合、收敛性，给出调参建议（DeePMD-kit）",
};

export default function LcurvePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-zinc-900 mb-2">📈 lcurve.out 训练诊断器</h1>
      <p className="text-zinc-500 mb-6">
        粘贴 <code className="text-zinc-700 bg-zinc-100 px-1 py-0.5 rounded text-sm">lcurve.out</code>{" "}
        内容，自动绘制能量 / 力 / 维里 RMSE 曲线，并给出发散、过拟合、收敛性诊断与调参建议。
        全部在浏览器本地完成，数据不会上传。
      </p>

      <LcurveAnalyzer />
    </div>
  );
}
