// ====== 知识文章 ======
export interface Article {
  slug: string;
  title: string;
  category: Category;
  summary: string;
  content: string; // Markdown
  tags: string[];
  sourceFiles: string[]; // 来源文件
}

export type Category =
  | "dpgen-workflow"
  | "deepmd-training"
  | "vasp-hpc"
  | "env-config"
  | "linux-tips"
  | "methodology";

export const CATEGORY_META: Record<Category, { label: string; icon: string; color: string }> = {
  "dpgen-workflow": { label: "DP-GEN 工作流", icon: "🔄", color: "bg-blue-100 text-blue-800" },
  "deepmd-training": { label: "DeePMD 训练", icon: "🧠", color: "bg-purple-100 text-purple-800" },
  "vasp-hpc": { label: "VASP / 超算", icon: "💻", color: "bg-green-100 text-green-800" },
  "env-config": { label: "环境配置", icon: "⚙️", color: "bg-orange-100 text-orange-800" },
  "linux-tips": { label: "Linux 速查", icon: "🐧", color: "bg-cyan-100 text-cyan-800" },
  methodology: { label: "学习方法论", icon: "💡", color: "bg-pink-100 text-pink-800" },
};

// ====== 速查表 ======
export interface CheatsheetItem {
  id: string;
  category: "command" | "param" | "path" | "script";
  label: string;
  description: string;
  code: string; // 可直接复制的命令/代码
  tags: string[];
}

// ====== 学习进度 ======
export interface ProgressEntry {
  slug: string;
  completed: boolean;
  completedAt?: string; // ISO date
  notes?: string;
}

// ====== 官方文档摘要 ======
export interface DocEntry {
  id: string;
  source: "deepmd" | "vasp" | "lammps";
  title: string;
  summary: string; // 中文摘要
  content: string; // 详细内容（用于搜索）
  url: string; // 官方链接
  tags: string[];
}

// ====== QA 问答 ======
export interface QAResult {
  question: string;
  answer: string; // AI 生成或检索拼接
  sources: {
    title: string;
    snippet: string;
    url?: string;
    isOfficial: boolean;
  }[];
  mode: "search-only" | "ai-enhanced";
}

// ====== 搜索索引项 ======
export interface SearchIndexItem {
  id: string;
  title: string;
  content: string;
  category: string;
  url: string;
  type: "article" | "doc" | "cheatsheet";
}
