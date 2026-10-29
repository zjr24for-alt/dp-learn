import type { Article, SearchIndexItem } from "@/lib/types";
import { dpgenWorkflowArticles } from "./dpgen-workflow";

import { deepmdTrainingArticles } from "./deepmd-training";
import { vaspHpcArticles } from "./vasp-hpc";
import { envConfigArticles } from "./env-config";
import { linuxTipsArticles } from "./linux-tips";
import { methodologyArticles } from "./methodology";
import { compMaterialsArticles } from "./comp-materials";
import { atomisticSimArticles } from "./atomistic-sim";
import { ovitoTipsArticles } from "./ovito-tips";
import { dpgenHandsonArticles } from "./dpgen-handson";
import { deepmdQuickstartArticles } from "./deepmd-quickstart";
import { lammpsDeepmdArticles } from "./lammps-deepmd";
import { dpdataGuideArticles } from "./dpdata-guide";
import { deepmdTuningArticles } from "./deepmd-tuning";
import { machineConfigArticles } from "./machine-config";
import { cheatsheetItems } from "./cheatsheet";
import { officialDocs } from "./official-docs/index";

/**
 * 内置文章时间戳：以各内容文件最后一次 git 提交日期为准（便于「最近更新」排序）。
 * 新内容文件补进来时，在此追加对应日期即可。
 */
const FILE_UPDATED_AT: Record<string, string> = {
  "dpgen-workflow": "2026-10-29",
  "deepmd-training": "2026-10-29",
  "machine-config": "2026-10-29",
  "env-config": "2026-10-29",
  "vasp-hpc": "2026-10-29",
  methodology: "2026-10-29",
  "dpgen-handson": "2026-06-04",
  "deepmd-quickstart": "2026-06-04",
  "deepmd-tuning": "2026-06-04",
  "lammps-deepmd": "2026-06-04",
  "dpdata-guide": "2026-06-04",
  "comp-materials": "2026-06-02",
  "atomistic-sim": "2026-06-02",
  "ovito-tips": "2026-06-02",
  "linux-tips": "2026-06-02",
};

/** 给一组文章注入 createdAt/updatedAt（按来源文件的最后修改日期） */
function withTimestamps(articles: Article[], file: string): Article[] {
  const date = FILE_UPDATED_AT[file] ?? "2026-06-02";
  return articles.map((a) => ({
    ...a,
    createdAt: a.createdAt ?? date,
    updatedAt: a.updatedAt ?? date,
  }));
}

/** 全部文章（含时间戳） */
export const allArticles: Article[] = [
  ...withTimestamps(dpgenWorkflowArticles, "dpgen-workflow"),
  ...withTimestamps(dpgenHandsonArticles, "dpgen-handson"),
  ...withTimestamps(deepmdTrainingArticles, "deepmd-training"),
  ...withTimestamps(deepmdQuickstartArticles, "deepmd-quickstart"),
  ...withTimestamps(vaspHpcArticles, "vasp-hpc"),
  ...withTimestamps(envConfigArticles, "env-config"),
  ...withTimestamps(linuxTipsArticles, "linux-tips"),
  ...withTimestamps(methodologyArticles, "methodology"),
  ...withTimestamps(compMaterialsArticles, "comp-materials"),
  ...withTimestamps(atomisticSimArticles, "atomistic-sim"),
  ...withTimestamps(ovitoTipsArticles, "ovito-tips"),
  ...withTimestamps(lammpsDeepmdArticles, "lammps-deepmd"),
  ...withTimestamps(dpdataGuideArticles, "dpdata-guide"),
  ...withTimestamps(deepmdTuningArticles, "deepmd-tuning"),
  ...withTimestamps(machineConfigArticles, "machine-config"),
];

/** 按最后更新倒序（首页「最近更新」、Learn 排序共用） */
export function getRecentArticles(limit = 6): Article[] {
  return [...allArticles].sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")).slice(0, limit);
}

/** 按类别获取文章 */
export function getArticlesByCategory(category: string): Article[] {
  return allArticles.filter((a) => a.category === category);
}

/** 按 slug 获取单篇文章 */
export function getArticleBySlug(slug: string): Article | undefined {
  return allArticles.find((a) => a.slug === slug);
}

/** 速查表 */
export { cheatsheetItems };

/** 官方文档 */
export { officialDocs };

/** 构建全局搜索索引 */
export function buildAllSearchIndex(): SearchIndexItem[] {
  const items: SearchIndexItem[] = [];

  for (const article of allArticles) {
    items.push({
      id: article.slug,
      title: article.title,
      content: article.summary + " " + (article.tags || []).join(" ") + " " + article.content,
      category: article.category,
      url: `/learn/${article.slug}`,
      type: "article",
    });
  }

  for (const doc of officialDocs) {
    items.push({
      id: doc.id,
      title: doc.title,
      content: doc.summary + " " + doc.content,
      category: `official-${doc.source}`,
      url: doc.url,
      type: "doc",
    });
  }

  for (const cs of cheatsheetItems) {
    items.push({
      id: cs.id,
      title: cs.label,
      content: cs.description + " " + cs.code,
      category: cs.category,
      url: "/cheatsheet",
      type: "cheatsheet",
    });
  }

  return items;
}
