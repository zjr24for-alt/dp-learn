/**
 * 搜索行为测试：用真实内容构建 Fuse 索引，验证关键查询能命中预期文章。
 * 运行：node scripts/search-behavior-test.mjs
 */
import Fuse from "fuse.js";

const FILES = [
  ["dpgenWorkflowArticles", "dpgen-workflow"],
  ["dpgenHandsonArticles", "dpgen-handson"],
  ["deepmdTrainingArticles", "deepmd-training"],
  ["deepmdQuickstartArticles", "deepmd-quickstart"],
  ["deepmdTuningArticles", "deepmd-tuning"],
  ["vaspHpcArticles", "vasp-hpc"],
  ["lammpsDeepmdArticles", "lammps-deepmd"],
  ["dpdataGuideArticles", "dpdata-guide"],
  ["machineConfigArticles", "machine-config"],
  ["compMaterialsArticles", "comp-materials"],
  ["atomisticSimArticles", "atomistic-sim"],
  ["ovitoTipsArticles", "ovito-tips"],
  ["envConfigArticles", "env-config"],
  ["linuxTipsArticles", "linux-tips"],
  ["methodologyArticles", "methodology"],
];

const items = [];
for (const [exportName, file] of FILES) {
  const mod = await import(`../content/${file}.ts`);
  for (const a of mod[exportName]) {
    items.push({
      id: a.slug,
      title: a.title,
      content: `${a.summary} ${(a.tags || []).join(" ")} ${a.content}`,
      category: a.category,
      url: `/learn/${a.slug}`,
      type: "article",
    });
  }
}

const fuse = new Fuse(items, {
  keys: [
    { name: "title", weight: 2 },
    { name: "content", weight: 1 },
    { name: "category", weight: 0.5 },
    { name: "tags", weight: 1.5 },
  ],
  threshold: 0.4,
  distance: 100,
  includeScore: true,
  minMatchCharLength: 1,
});

const queries = ["lammps", "kpoints", "ovito", "vasp 超算", "model_devi", "截断能"];
let fail = 0;
for (const q of queries) {
  const r = fuse.search(q).slice(0, 3).map((x) => x.item.title);
  console.log(`「${q}」=> ${r.join(" | ") || "(无结果)"}`);
  if (r.length === 0) fail++;
}
console.log(`\n索引 ${items.length} 条，查询 ${queries.length} 个，空结果 ${fail}`);
process.exit(fail ? 1 : 0);
