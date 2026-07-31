/**
 * DP-GEN 统一标准流程（SOP）数据。
 * 拿到新材料/新势函数时的固定操作路线，五阶段 + 步骤勾选进度。
 * 纯数据模块（无 "use client"）。
 */

export interface SopChecklistItem {
  /** localStorage 进度键。引用文章时与文章 slug 相同；纯 action 项用 sop-* 合成键 */
  slug: string;
  /** 显示文案 */
  label: string;
  /** 跳转地址。缺省 → /learn/${slug}；速查表条目显式给 "/cheatsheet"；action 项不写 */
  href?: string;
}

export interface SopInlineNote {
  title: string;
  paragraphs: string[];
  code?: string;
}

export interface SopStage {
  num: string;
  icon: string;
  title: string;
  desc: string;
  /** 大按钮（阶段 2 直通配置构建器） */
  cta?: { href: string; label: string };
  checklist: SopChecklistItem[];
  /** 非勾选的相关阅读 */
  links?: { href: string; label: string }[];
  command?: string;
  inlineNotes?: SopInlineNote[];
}

export const SOP_STAGES: SopStage[] = [
  {
    num: "1",
    icon: "🧱",
    title: "建模",
    desc: "确定初始晶体结构：简单体系（纯元素/有序化合物）用 CIF → POSCAR；高熵合金/无序固溶体用 ATAT 生成 SQS 超胞。目标产出干净、可复现的 POSCAR。",
    checklist: [
      { slug: "dpgen-workflow-overview", label: "DP 势函数生成完整流程（先建立五阶段全局观）" },
      { slug: "ase-practical-workflow", label: "ASE 实战：结构操作与高通量计算" },
      { slug: "cmd-ase-build", label: "ASE 构建超胞/表面", href: "/cheatsheet" },
      { slug: "cmd-ase-relax", label: "ASE 结构弛豫", href: "/cheatsheet" },
      { slug: "sop-stage1-poscar", label: "已产出干净 POSCAR（VASP 约定、单位 Å、无悬挂原子）" },
    ],
    inlineNotes: [
      {
        title: "高熵合金 / 无序固溶体：ATAT · SQS 建模要点",
        paragraphs: [
          "简单体系用 CIF + ASE 即可；高熵合金/随机固溶体才需要 ATAT 的 mcsqs 生成特殊准随机结构（SQS）。SQS 的目标不是能量最低，而是短程关联函数最接近随机固溶体，小超胞也可用。",
          "生成流程：先用 ASE/atomsk 建元素随机占位的初始超胞 → 运行 mcsqs 迭代优化，直至 pair/多体关联函数误差达目标（通常 ≤1e-3 量级）→ 用 corrdump 对比目标关联函数，重点看前几个近邻壳层的 pair 项是否匹配。",
          "转 POSCAR：用 ATAT 的 cell2vasp 或 atomsk 转成 VASP 约定，核对原子数与化学计量比。具体命令以你安装的 ATAT 版本为准。",
        ],
        code: "# 以 32 原子、截断半径 10 Å 的 SQS 为例（命令随 ATAT 版本略有差异）\nmcsqs -n 32 -rc 10.0\ncorrdump -rnd -c > sqs_pair.out\ncell2vasp < sqs.out > POSCAR",
      },
    ],
  },
  {
    num: "2",
    icon: "⚙️",
    title: "DFT 参数准备",
    desc: "复用配置构建器生成 param.json / machine.json（train·model_devi·fp 三段）/ INCAR_fp，不重复造轮子。构建器内置深度校验、交叉检查与 AI 提示词辅助。",
    cta: { href: "/config-builder", label: "打开配置构建器 →" },
    checklist: [
      { slug: "dpgen-param-json-reference", label: "param.json 关键参数速查" },
      { slug: "machine-json-guide", label: "machine.json 配置指南" },
      { slug: "precheck-fp-script", label: "FP 任务提交前检查脚本" },
      { slug: "deepmd-training-params", label: "DeePMD 训练参数详解" },
      { slug: "dft-materials-intro", label: "DFT 与材料计算基础（ENCUT/k 点收敛）" },
      { slug: "kpoints-float-bug-fix", label: "KPOINTS Float Bug 修复（dpgen 源码修改）" },
    ],
  },
  {
    num: "3",
    icon: "🌱",
    title: "init_bulk · 初始数据集",
    desc: "从 POSCAR 运行 init_bulk 生成并筛选初始构型，构建初始数据集。重点关注冷启动策略与 trust 阈值初值。",
    command: "dpgen run param.json machine.json",
    checklist: [
      { slug: "cmd-dpgen-run", label: "启动 dpgen", href: "/cheatsheet" },
      { slug: "param-trust-lo", label: "model_devi_f_trust_lo 初值", href: "/cheatsheet" },
      { slug: "param-trust-hi", label: "model_devi_f_trust_hi 初值", href: "/cheatsheet" },
      { slug: "sop-init-cold-start", label: "已确定冷启动策略（见下方要点）" },
      { slug: "sop-init-done", label: "已产出初始数据集（data/init 或 init_data/set.xxx）" },
    ],
    links: [
      { href: "/learn/dpgen-workflow-overview", label: "回顾：五阶段总览 · init_bulk 段" },
      { href: "/learn/dpgen-troubleshooting", label: "常见错误排查" },
    ],
    inlineNotes: [
      {
        title: "冷启动策略（无初始模型时 trust 无法打分）",
        paragraphs: [
          "三种冷启动路径：① 低温短 MD 起步——先跑 300 K 左右短 MD 得少量近平衡构型训练粗模型，再渐进升温扩大采样；② 沿用已有势——用同体系/同族预训练 deepmd 势直接打 trust 分；③ 人为扩多样本——随机位移/多体积/缺陷构型扩充 init 数据，降低对单条轨道依赖。",
          "init_bulk 只生成完美块体的晶格形变构型（无温度概念），缺少缺陷/高温/非平衡构型。数据丰富度决定后续主动学习收敛速度——宁可在这一阶段多放构型。",
        ],
      },
    ],
  },
  {
    num: "4",
    icon: "🔄",
    title: "主动学习闭环",
    desc: "train → model_devi → fp 迭代：用 committee 模型预测不确定度（模型偏差）挑出候选结构，对高偏差结构做 DFT 标注，数据回流后重训。异常候选人工研判，并按需用 dpdata 并入额外数据（AIMD/实验/文献）。",
    checklist: [
      { slug: "dpgen-practical-guidelines", label: "实战指南：参数配置到收敛判断" },
      { slug: "committee-model", label: "Committee 模型策略（为什么 4 个模型）" },
      { slug: "candidate-health-check", label: "模型偏差与 candidate 健康判断" },
      { slug: "dpgen-check-commands", label: "常用检查指令（record/candidate/train.log）" },
      { slug: "data-reflux-outcar-to-set", label: "数据回流：OUTCAR → set.xxx" },
      { slug: "dpdata-dpgen-integration", label: "dpdata 在 DP-GEN 中的应用（人工并入数据）" },
    ],
    links: [{ href: "/learn/dpgen-troubleshooting", label: "常见错误排查" }],
  },
  {
    num: "5",
    icon: "🧪",
    title: "势函数质量验证",
    desc: "从能量/RMSE 到力学与动力学性质，多维度验证：dp test RMSE → 弹性常数 → 声子 → 缺陷/位错，并与 DFT 参考值逐项对比。",
    command: "dp test -s deepmd -m graph.pb -N 200",
    checklist: [
      { slug: "deepmd-quick-start", label: "DeePMD 快速上手：数据到势函数" },
      { slug: "elastic-constants-dft", label: "DFT 计算弹性常数与力学性质" },
      { slug: "phonon-thermodynamics", label: "声子谱与热力学性质计算" },
      { slug: "phonopy-phono3py-workflow", label: "Phonopy + phono3py 实战" },
      { slug: "ovito-dxa-defects", label: "缺陷与位错分析：DXA" },
      { slug: "ovito-cna-ptm", label: "晶体结构识别：CNA 与 PTM" },
    ],
    links: [{ href: "/cheatsheet", label: "速查：cmd-dp-test · 模型测试" }],
    inlineNotes: [
      {
        title: "DFT 缺陷形成能（vacancy / interstitial）",
        paragraphs: [
          "公式：ΔE_f = E_def − E_perfect + Σ n_i·μ_i + q(E_VBM + ε_F) + E_corr。n_i>0 表示移除原子（缺陷源），μ_i 取稳定相平衡下的化学势；q 为电荷态，E_VBM 为价带顶，ε_F 为费米能级；E_corr 为有限尺寸修正。",
          "步骤：① 建足够大的超胞（≥2×2×2，通常 64–128 原子）抑制周期性镜像作用；② 同参数优化完美与含缺陷超胞；③ 取富 A/富 B 两个化学势端点绘制缺陷相图；④ 带电缺陷用 Freysoldt 修正（sxdefectalign）或增大超胞。",
          "与 deepmd 势对比时保持超胞尺寸与 k 点完全一致，否则误差不可比。",
        ],
      },
      {
        title: "NEB / CI-NEB 迁移能垒",
        paragraphs: [
          "NEB/CI-NEB 计算迁移能垒：① 分别优化初态与末态结构；② 用 ase.neb 或 pymatgen 线性插值生成 7–11 个 image 的初始路径；③ 用 VTST 版 VASP（ICHAIN=0, LCLIMB=.TRUE.）或 LAMMPS neb 命令执行；④ 收敛判据：切向力 < 0.02 eV/Å 且能量收敛；⑤ 用 nebresults.pl 提取鞍点能垒，拟合 MEP 曲线；⑥ 鞍点做频率计算确认仅一个虚频。",
          "与 DFT 端态/鞍点对比时，deepmd 势能垒误差应在 0.1 eV 量级内。",
        ],
      },
    ],
  },
];

/** 去重后的全部勾选 slug —— 供总进度条使用，避免重复计数 */
export const ALL_SOP_SLUGS: string[] = Array.from(
  new Set(SOP_STAGES.flatMap((s) => s.checklist.map((c) => c.slug)))
);
