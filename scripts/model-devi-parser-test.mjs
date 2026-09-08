/**
 * model_devi 解析器/诊断逻辑测试。
 * 运行：node scripts/model-devi-parser-test.mjs
 */
import { parseModelDevi, diagnoseModelDevi } from "../lib/model-devi.ts";

let fail = 0;
function check(name, ok, extra = "") {
  console.log(`${ok ? "✅" : "❌"} ${name}${extra ? ` — ${extra}` : ""}`);
  if (!ok) fail++;
}

const sample = `#  step     max_devi_f     min_devi_f     avg_devi_f     max_devi_e     min_devi_e     avg_devi_e
0       1.86e+00       6.20e-02       6.41e-01       1.03e-01       5.70e-03       3.61e-02
1       9.40e-01       3.10e-02       3.32e-01       6.81e-02       4.20e-03       2.14e-02
2       6.10e-01       2.60e-02       2.17e-01       5.52e-02       3.10e-03       1.52e-02
3       4.32e-01       1.80e-02       1.55e-01       4.15e-02       2.40e-03       1.06e-02
4       3.18e-01       1.50e-02       1.16e-01       3.40e-02       1.80e-03       7.90e-03
5       2.55e-01       1.20e-02       9.30e-02       2.80e-02       1.40e-03       6.10e-03
6       2.10e-01       1.00e-02       7.80e-02       2.41e-02       1.20e-03       5.10e-03
7       1.78e-01       9.00e-03       6.70e-02       2.11e-02       1.00e-03       4.40e-03
8       1.55e-01       8.00e-03       5.90e-02       1.88e-02       9.00e-04       3.80e-03
9       1.37e-01       7.00e-03       5.20e-02       1.70e-02       8.00e-04       3.40e-03
10      1.23e-01       6.00e-03       4.70e-02       1.55e-02       7.00e-04       3.00e-03`;

const r = parseModelDevi(sample);
check("解析 11 帧", r.rows.length === 11, `rows=${r.rows.length}`);
check("maxF/avgF 字段", r.rows[0].maxF === 1.86 && r.rows[0].avgF === 6.41e-1);
check("maxE/minE 字段", r.rows[0].maxE === 1.03e-1 && r.rows[0].minE === 5.7e-3);
check("step 字段", r.rows[10].step === 10);
check("无解析警告", r.warnings.length === 0);

// 收敛场景：maxF 全部低于 trust_lo → 可收敛
const converged = `# step max_devi_f min_devi_f avg_devi_f max_devi_e min_devi_e avg_devi_e
0 4.20e-02 1.80e-03 2.10e-02 6.10e-03 3.00e-04 2.90e-03
1 3.10e-02 1.50e-03 1.60e-02 4.80e-03 2.00e-04 2.20e-03
2 2.40e-02 1.20e-03 1.20e-02 3.90e-03 2.00e-04 1.80e-03
3 1.80e-02 1.00e-03 9.00e-03 3.20e-03 1.00e-04 1.40e-03
4 1.30e-02 8.00e-04 7.00e-03 2.60e-03 1.00e-04 1.10e-03
5 1.10e-02 7.00e-04 5.50e-03 2.20e-03 1.00e-04 9.00e-04
6 9.00e-03 6.00e-04 4.50e-03 1.90e-03 1.00e-04 8.00e-04
7 8.00e-03 5.00e-04 4.00e-03 1.70e-03 1.00e-04 7.00e-04
8 7.00e-03 5.00e-04 3.50e-03 1.50e-03 1.00e-04 6.00e-04
9 6.50e-03 4.00e-04 3.20e-03 1.40e-03 1.00e-04 6.00e-04
10 6.00e-03 4.00e-04 3.00e-03 1.30e-03 1.00e-04 5.00e-04`;
const dGood = diagnoseModelDevi(parseModelDevi(converged).rows, { fLo: 0.05, fHi: 0.2 });
check("全部低于 lo → 可信", dGood.stats.loRatio === 1, `loRatio=${dGood.stats.loRatio}`);
check("hiRatio 为 0", dGood.stats.hiRatio === 0);
check("趋势下降", dGood.stats.trend === "falling", `trend=${dGood.stats.trend}`);
check("有收敛结论", dGood.diagnoses.some((x) => x.title.includes("可收敛")));

// 发散场景：大部分帧超过 hi
const bad = `# step max_devi_f min_devi_f avg_devi_f max_devi_e min_devi_e avg_devi_e
0 3.5e+00 2.1e-01 1.8e+00 2.5e-01 1.5e-02 1.1e-01
1 3.2e+00 1.9e-01 1.7e+00 2.2e-01 1.2e-02 9.8e-02
2 3.8e+00 2.4e-01 1.9e+00 2.8e-01 1.8e-02 1.2e-01
3 3.4e+00 2.0e-01 1.7e+00 2.4e-01 1.4e-02 1.0e-01
4 3.9e+00 2.5e-01 2.0e+00 2.9e-01 1.9e-02 1.3e-01`;
const rBad = parseModelDevi(bad);
const dBad = diagnoseModelDevi(rBad.rows, { fLo: 0.05, fHi: 0.2 });
check("高偏差占比高", dBad.stats.hiRatio === 1, `hiRatio=${dBad.stats.hiRatio}`);
check("危险诊断", dBad.diagnoses.some((x) => x.level === "danger"));
check("无收敛结论", !dBad.diagnoses.some((x) => x.title.includes("可收敛")));

// 垃圾输入
const garbage = parseModelDevi("not a number line\nxxx");
check("垃圾输入返回空", garbage.rows.length === 0);

console.log(`\n${fail === 0 ? "全部通过" : `${fail} 项失败`}`);
process.exit(fail ? 1 : 0);
