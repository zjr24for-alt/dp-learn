/**
 * lcurve 解析器/诊断逻辑测试。
 * 运行：node scripts/lcurve-parser-test.mjs
 */
import { parseLcurve, diagnoseLcurve } from "../lib/lcurve.ts";

let fail = 0;
function check(name, ok, extra = "") {
  console.log(`${ok ? "✅" : "❌"} ${name}${extra ? ` — ${extra}` : ""}`);
  if (!ok) fail++;
}

// 1. 本站文档格式（8 列）
const docFormat = `#  step      rmse_val    rmse_trn    rmse_e_val  rmse_e_trn    rmse_f_val  rmse_f_trn         lr
0      3.33e+01    3.41e+01      1.03e+01    1.03e+01      8.39e-01    8.72e-01    1.0e-03
100    1.23e+01    1.10e+01      5.21e+00    4.98e+00      4.20e-01    3.90e-01    9.0e-04
200    5.01e+00    4.02e+00      2.10e+00    1.80e+00      2.10e-01    1.75e-01    8.0e-04`;
const r1 = parseLcurve(docFormat);
check("8 列格式解析 3 行", r1.rows.length === 3, `rows=${r1.rows.length}`);
check("valF/trnF 字段正确", r1.rows[2].valF === 2.1e-1 && r1.rows[2].trnF === 1.75e-1);
check("lr 字段正确", r1.rows[2].lr === 8.0e-4);
check("step 正确", r1.rows[2].step === 200);
check("无表头警告", r1.warnings.length === 0);

// 2. DeePMD-kit 默认格式（9 列）
const kitFormat = `# step rmse_trn rmse_val rmse_trn_e rmse_trn_f rmse_trn_v rmse_val_e rmse_val_f rmse_val_v
0 8.18e+00 8.18e+00 8.18e+00 8.18e+00 0.00e+00 8.18e+00 8.18e+00 0.00e+00
10 3.00e+00 3.10e+00 1.50e+00 1.80e+00 5.00e-02 1.60e+00 1.90e+00 5.50e-02`;
const r2 = parseLcurve(kitFormat);
check("9 列格式解析", r2.rows.length === 2);
check("kit 格式 valF/trnV 正确", r2.rows[1].valF === 1.9 && r2.rows[1].trnV === 5e-2);
check("kit 格式 trn 在前 val 在后", r2.rows[1].trn === 3.0 && r2.rows[1].val === 3.1);

// 3. 无表头回退（8 列 = 文档顺序）
const noHeader = `0 3.33e+01 3.41e+01 1.03e+01 1.03e+01 8.39e-01 8.72e-01 1.0e-03
100 1.23e+01 1.10e+01 5.21e+00 4.98e+00 4.20e-01 3.90e-01 9.0e-04`;
const r3 = parseLcurve(noHeader);
check("无表头 8 列回退", r3.rows.length === 2 && r3.warnings.length > 0);
check("无表头回退 valF 正确", r3.rows[1].valF === 4.2e-1);

// 4. 诊断：正常收敛
const good = parseLcurve(docFormat);
const dGood = diagnoseLcurve(good.rows);
check("正常收敛无发散", !dGood.stats.divergent);
check("正常训练有质量分级", dGood.diagnoses.some((x) => x.title.includes("力 RMSE")));

// 5. 诊断：NaN 发散
const nanData = parseLcurve(
  `# step rmse_val rmse_trn rmse_e_val rmse_e_trn rmse_f_val rmse_f_trn lr
0 1.00e+01 1.00e+01 5.00e+00 5.00e+00 8.00e-01 8.00e-01 1.0e-03
100 nan nan nan nan nan nan 1.0e-03`
);
const dNaN = diagnoseLcurve(nanData.rows);
check("NaN 检测", dNaN.stats.hasNaN && dNaN.diagnoses.some((x) => x.level === "danger"));

// 6. 诊断：发散（末值远大于最小值）
const diverge = parseLcurve(
  `# step rmse_val rmse_trn rmse_f_val rmse_f_trn
0 1.0e+00 1.0e+00 5.0e-01 5.0e-01
10 8.0e-01 7.0e-01 4.0e-01 3.5e-01
20 6.0e-01 5.0e-01 3.0e-01 2.5e-01
30 2.0e+00 1.8e+00 1.5e+00 1.4e+00
40 3.5e+00 3.2e+00 2.8e+00 2.6e+00`
);
const dDiv = diagnoseLcurve(diverge.rows);
check("发散检测", dDiv.stats.divergent, `min=${dDiv.stats.minValF}`);

// 7. 诊断：过拟合（val 高且差距扩大）
const overfit = parseLcurve(
  `# step rmse_val rmse_trn rmse_f_val rmse_f_trn
0 1.0e+00 1.0e+00 5.0e-01 5.0e-01
10 8.0e-01 7.0e-01 4.0e-01 3.0e-01
20 7.0e-01 5.0e-01 3.5e-01 2.0e-01
30 6.5e-01 3.0e-01 3.2e-01 1.0e-01
40 6.2e-01 1.5e-01 3.0e-01 5.0e-02`
);
const dOv = diagnoseLcurve(overfit.rows);
check("过拟合检测", dOv.stats.overfitting, dOv.diagnoses.map((x) => x.title).join(";"));

// 8. 垃圾输入
const garbage = parseLcurve("hello world\nnot numbers\n");
check("垃圾输入返回空", garbage.rows.length === 0);

console.log(`\n${fail === 0 ? "全部通过" : `${fail} 项失败`}`);
process.exit(fail ? 1 : 0);
