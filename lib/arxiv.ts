// 论文搜索客户端 — 使用 Semantic Scholar API（免费、支持 CORS、无需密钥）
// 文档: https://api.semanticscholar.org/api-docs/

export interface ArxivPaper {
  id: string; // Semantic Scholar paper ID
  title: string;
  summary: string; // 摘要
  authors: string[];
  published: string; // 年份
  categories: string[]; // fields of study
  primaryCategory: string;
  pdfUrl: string;
  abstractUrl: string;
  arxivId?: string; // arXiv ID（如果有的话）
  doi?: string;
  citationCount?: number;
  venue?: string;
}

export interface ArxivSearchParams {
  query: string;
  maxResults?: number;
  start?: number;
  sortBy?: "relevance" | "lastUpdatedDate" | "submittedDate";
  sortOrder?: "ascending" | "descending";
  category?: string;
}

const S2_API = "https://api.semanticscholar.org/graph/v1/paper/search";

// 将 arXiv 分类映射到 Semantic Scholar fieldsOfStudy
const CATEGORY_TO_FIELD: Record<string, string> = {
  "cond-mat.mtrl-sci": "Materials Science",
  "physics.comp-ph": "Physics",
  "cs.LG": "Computer Science",
  "physics.chem-ph": "Chemistry",
  "cond-mat.stat-mech": "Physics",
  "cond-mat.mes-hall": "Physics",
};

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

function parseAuthorName(raw: string): string {
  // Semantic Scholar returns "Last, First" or just "Last"
  const parts = raw.split(",").map((s) => s.trim());
  if (parts.length === 2) {
    return `${parts[1]} ${parts[0]}`;
  }
  return raw;
}

export async function searchArxiv(params: ArxivSearchParams): Promise<{
  papers: ArxivPaper[];
  totalResults: number;
}> {
  const limit = Math.min(params.maxResults || 20, 100);
  const offset = params.start || 0;

  const url = new URL(S2_API);
  url.searchParams.set("query", params.query.trim());
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));

  // 请求的字段
  const fields = [
    "paperId",
    "externalIds",
    "title",
    "abstract",
    "authors",
    "year",
    "publicationVenue",
    "citationCount",
    "url",
    "openAccessPdf",
    "fieldsOfStudy",
    "publicationDate",
  ];
  url.searchParams.set("fields", fields.join(","));

  // 分类过滤
  if (params.category && CATEGORY_TO_FIELD[params.category]) {
    url.searchParams.set("fieldsOfStudy", CATEGORY_TO_FIELD[params.category]);
  }

  const res = await fetch(url.toString());

  if (!res.ok) {
    throw new Error(`Semantic Scholar API 请求失败 (${res.status})`);
  }

  const data = await res.json();
  const totalResults = data.total || 0;
  const rawPapers = data.data || [];

  const papers: ArxivPaper[] = rawPapers.map((p: any) => {
    const arxivId = p.externalIds?.ArXiv || undefined;
    const doi = p.externalIds?.DOI || undefined;
    const fieldsOfStudy: string[] = p.fieldsOfStudy || [];
    const primaryCat = fieldsOfStudy[0] || "N/A";

    return {
      id: p.paperId || "",
      title: p.title || "Untitled",
      summary: p.abstract || "暂无摘要",
      authors: (p.authors || []).map((a: any) => parseAuthorName(a.name)),
      published: p.year?.toString() || p.publicationDate || "",
      categories: fieldsOfStudy,
      primaryCategory: primaryCat,
      pdfUrl: p.openAccessPdf?.url || (arxivId ? `https://arxiv.org/pdf/${arxivId}` : p.url || "#"),
      abstractUrl: arxivId
        ? `https://arxiv.org/abs/${arxivId}`
        : p.url || `https://www.semanticscholar.org/paper/${p.paperId}`,
      arxivId,
      doi,
      citationCount: p.citationCount,
      venue: p.publicationVenue?.name || undefined,
    };
  });

  return { papers, totalResults };
}
