// arXiv API client — 纯客户端调用，无需 API Key
// API 文档: https://info.arxiv.org/help/api/

export interface ArxivPaper {
  id: string; // arxiv ID (e.g. "2301.12345")
  title: string;
  summary: string; // 摘要
  authors: string[];
  published: string; // ISO date
  updated: string;
  categories: string[]; // e.g. ["cond-mat.mtrl-sci", "physics.comp-ph"]
  primaryCategory: string;
  pdfUrl: string;
  abstractUrl: string;
  comment?: string; // 备注（如 "Accepted at NeurIPS 2023"）
  doi?: string;
}

export interface ArxivSearchParams {
  query: string;
  maxResults?: number; // max 100
  start?: number; // 分页偏移
  sortBy?: "relevance" | "lastUpdatedDate" | "submittedDate";
  sortOrder?: "ascending" | "descending";
  category?: string; // 限制分类
}

const ARXIV_API = "https://export.arxiv.org/api/query";

// 与 DP 相关的预设分类
export const DP_CATEGORIES = [
  { value: "", label: "全部" },
  { value: "cond-mat.mtrl-sci", label: "材料科学" },
  { value: "physics.comp-ph", label: "计算物理" },
  { value: "cs.LG", label: "机器学习" },
  { value: "physics.chem-ph", label: "化学物理" },
  { value: "cond-mat.stat-mech", label: "统计力学" },
  { value: "cond-mat.mes-hall", label: "介观/纳米" },
];

export const DP_PRESET_QUERIES = [
  { label: "Deep Potential", query: "deep potential molecular dynamics" },
  { label: "Machine Learning Potential", query: "machine learning interatomic potential" },
  { label: "DP-GEN", query: "dp-gen active learning" },
  { label: "DeePMD", query: "deepmd neural network potential" },
  { label: "VASP + ML", query: "VASP machine learning ab initio" },
];

export async function searchArxiv(params: ArxivSearchParams): Promise<{
  papers: ArxivPaper[];
  totalResults: number;
}> {
  const maxResults = Math.min(params.maxResults || 20, 100);
  const start = params.start || 0;
  const sortBy = params.sortBy || "relevance";
  const sortOrder = params.sortOrder || "descending";

  let searchQuery = params.query.trim();
  if (params.category) {
    searchQuery = `(${searchQuery}) AND cat:${params.category}`;
  }

  const url = new URL(ARXIV_API);
  url.searchParams.set("search_query", searchQuery);
  url.searchParams.set("start", String(start));
  url.searchParams.set("max_results", String(maxResults));
  url.searchParams.set("sortBy", sortBy);
  url.searchParams.set("sortOrder", sortOrder);

  // arXiv API 不支持 CORS，浏览器直接调用会被拦截
  // 使用 CORS 代理中转，带超时和多代理容错
  const arxivUrl = url.toString();
  const proxies = [
    `https://corsproxy.io/?url=${encodeURIComponent(arxivUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(arxivUrl)}`,
  ];

  let res: Response | null = null;
  let lastError = "";

  for (const proxyUrl of proxies) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      res = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) break;
    } catch (e: any) {
      lastError = e.message || "fetch failed";
    }
  }

  if (!res || !res.ok) {
    throw new Error(`arXiv 搜索失败（网络或代理不可用）: ${lastError}`);
  }

  if (!res.ok) {
    throw new Error(`arXiv API 请求失败 (${res.status})`);
  }

  const xmlText = await res.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");

  // Parse total results
  const totalResultsEl = doc.querySelector("opensearch|totalResults, totalResults");
  const totalResults = totalResultsEl ? parseInt(totalResultsEl.textContent || "0") : 0;

  // Parse entries
  const entries = doc.querySelectorAll("entry");
  const papers: ArxivPaper[] = [];

  for (const entry of entries) {
    const id = entry.querySelector("id")?.textContent?.replace("http://arxiv.org/abs/", "") || "";
    const title = entry.querySelector("title")?.textContent?.replace(/\s+/g, " ").trim() || "Untitled";
    const summary = entry.querySelector("summary")?.textContent?.replace(/\s+/g, " ").trim() || "";

    const authorEls = entry.querySelectorAll("author name");
    const authors = Array.from(authorEls).map((a) => a.textContent || "").filter(Boolean);

    const published = entry.querySelector("published")?.textContent || "";
    const updated = entry.querySelector("updated")?.textContent || "";

    const categoryEls = entry.querySelectorAll("category");
    const categories: string[] = [];
    let primaryCategory = "";
    for (const cat of categoryEls) {
      const term = cat.getAttribute("term") || "";
      if (term) categories.push(term);
      if (cat.getAttribute("scheme")?.includes("primary") || !primaryCategory) {
        primaryCategory = term;
      }
    }

    const comment = entry.querySelector("arxiv|comment, comment")?.textContent || undefined;
    const doiEl = entry.querySelector("arxiv|doi, doi");
    const doi = doiEl?.textContent || undefined;

    papers.push({
      id,
      title,
      summary,
      authors,
      published,
      updated,
      categories,
      primaryCategory,
      pdfUrl: `https://arxiv.org/pdf/${id}`,
      abstractUrl: `https://arxiv.org/abs/${id}`,
      comment,
      doi,
    });
  }

  return { papers, totalResults };
}
