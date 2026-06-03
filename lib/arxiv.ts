// 论文搜索客户端 — 双路容错
// 主路: arXiv API via CORS 代理（浏览器可用）
// 备路: Semantic Scholar API（原生CORS，但免费额度低）

export interface ArxivPaper {
  id: string;
  title: string;
  summary: string;
  authors: string[];
  published: string;
  categories: string[];
  primaryCategory: string;
  pdfUrl: string;
  abstractUrl: string;
  arxivId?: string;
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

export const DP_CATEGORIES = [
  { value: "", label: "全部" },
  { value: "cond-mat.mtrl-sci", label: "材料科学" },
  { value: "physics.comp-ph", label: "计算物理" },
  { value: "cs.LG", label: "机器学习" },
  { value: "physics.chem-ph", label: "化学物理" },
];

export const DP_PRESET_QUERIES = [
  { label: "Deep Potential", query: "deep potential molecular dynamics" },
  { label: "ML Potential", query: "machine learning interatomic potential" },
  { label: "DP-GEN", query: "dp-gen active learning framework" },
  { label: "DeePMD", query: "deepmd neural network potential" },
  { label: "VASP + ML", query: "VASP machine learning first principles" },
];

// ====== arXiv API (via CORS proxy) ======

const ARXIV_API = "https://export.arxiv.org/api/query";

async function searchArxivDirect(params: ArxivSearchParams): Promise<{
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

  const apiUrl = new URL(ARXIV_API);
  apiUrl.searchParams.set("search_query", searchQuery);
  apiUrl.searchParams.set("start", String(start));
  apiUrl.searchParams.set("max_results", String(maxResults));
  apiUrl.searchParams.set("sortBy", sortBy);
  apiUrl.searchParams.set("sortOrder", sortOrder);

  // 通过自建 API 路由中转（服务端直连 arXiv，无 CORS 问题）
  const proxyUrl = `/api/arxiv?${apiUrl.searchParams.toString()}`;
  const res = await fetch(proxyUrl);

  if (!res.ok) {
    throw new Error(`代理请求失败 (${res.status})`);
  }

  const xmlText = await res.text();

  // 检查返回内容是否以 <?xml 开头（排除代理返回 HTML 错误页）
  if (!xmlText.trim().startsWith("<?xml")) {
    throw new Error("代理返回了非 XML 内容，可能被限流");
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");

  const totalResultsEl = doc.querySelector("totalResults") || doc.querySelector("opensearch|totalResults");
  const totalResults = totalResultsEl ? parseInt(totalResultsEl.textContent || "0") : 0;

  const entries = doc.querySelectorAll("entry");
  const papers: ArxivPaper[] = [];

  for (const entry of entries) {
    const id = entry.querySelector("id")?.textContent?.replace(/^.*\/abs\//, "") || "";
    if (!id) continue;

    const title = entry.querySelector("title")?.textContent?.replace(/\s+/g, " ").trim() || "Untitled";
    const summary = entry.querySelector("summary")?.textContent?.replace(/\s+/g, " ").trim() || "";

    const authorEls = entry.querySelectorAll("author name");
    const authors = Array.from(authorEls).map((a) => a.textContent?.trim() || "").filter(Boolean);

    const published = entry.querySelector("published")?.textContent?.slice(0, 10) || "";

    const categoryEls = entry.querySelectorAll("category");
    const categories: string[] = [];
    let primaryCategory = "";
    for (const cat of categoryEls) {
      const term = cat.getAttribute("term") || "";
      if (term) categories.push(term);
      if (!primaryCategory) primaryCategory = term;
    }

    papers.push({
      id: `arxiv:${id}`,
      title,
      summary,
      authors,
      published,
      categories,
      primaryCategory,
      pdfUrl: `https://arxiv.org/pdf/${id}`,
      abstractUrl: `https://arxiv.org/abs/${id}`,
      arxivId: id,
    });
  }

  return { papers, totalResults };
}

// ====== Semantic Scholar (fallback) ======

const S2_API = "https://api.semanticscholar.org/graph/v1/paper/search";

async function searchSemanticScholar(params: ArxivSearchParams): Promise<{
  papers: ArxivPaper[];
  totalResults: number;
}> {
  const limit = Math.min(params.maxResults || 20, 100);
  const offset = params.start || 0;

  const url = new URL(S2_API);
  url.searchParams.set("query", params.query.trim());
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));

  const fields = [
    "paperId", "externalIds", "title", "abstract", "authors",
    "year", "publicationVenue", "citationCount", "url",
    "openAccessPdf", "fieldsOfStudy", "publicationDate",
  ];
  url.searchParams.set("fields", fields.join(","));

  return await fetchAndParseS2(url.toString());
}

/** S2 请求 + 解析，先尝试服务端代理，被限流则浏览器直连 */
async function fetchAndParseS2(externalUrl: string): Promise<{
  papers: ArxivPaper[];
  totalResults: number;
}> {
  let res: Response;
  const proxyUrl = `/api/semantic-scholar?${new URL(externalUrl).searchParams.toString()}`;

  try {
    res = await fetch(proxyUrl);
    // 代理返回 429，尝试浏览器直连 S2（S2 支持 CORS，客户端 IP 额度可能不同）
    if (res.status === 429) {
      res = await fetch(externalUrl);
    }
  } catch {
    // 代理不可达（静态导出场景），浏览器直连
    res = await fetch(externalUrl);
  }

  if (res.status === 429) {
    throw new Error("Semantic Scholar 请求太频繁，请稍后再试");
  }
  if (!res.ok) {
    throw new Error(`Semantic Scholar 请求失败 (${res.status})`);
  }

  const data = await res.json();
  return parseS2Response(data);
}

function parseS2Response(data: any): { papers: ArxivPaper[]; totalResults: number } {
  const rawPapers = data.data || [];

  const papers: ArxivPaper[] = rawPapers.map((p: any) => {
    const arxivId = p.externalIds?.ArXiv || undefined;
    const doi = p.externalIds?.DOI || undefined;
    const fieldsOfStudy: string[] = p.fieldsOfStudy || [];

    return {
      id: p.paperId || `s2:${Math.random()}`,
      title: p.title || "Untitled",
      summary: p.abstract || "暂无摘要",
      authors: (p.authors || []).map((a: any) => {
        const parts = (a.name || "").split(",").map((s: string) => s.trim());
        return parts.length === 2 ? `${parts[1]} ${parts[0]}` : a.name || "";
      }),
      published: p.year?.toString() || "",
      categories: fieldsOfStudy,
      primaryCategory: fieldsOfStudy[0] || "N/A",
      pdfUrl: p.openAccessPdf?.url || (arxivId ? `https://arxiv.org/pdf/${arxivId}` : "#"),
      abstractUrl: arxivId
        ? `https://arxiv.org/abs/${arxivId}`
        : `https://www.semanticscholar.org/paper/${p.paperId}`,
      arxivId,
      doi,
      citationCount: p.citationCount,
      venue: p.publicationVenue?.name || undefined,
    };
  });

  return { papers, totalResults: data.total || 0 };
}

// ====== 统一入口（双路容错） ======

export async function searchArxiv(params: ArxivSearchParams): Promise<{
  papers: ArxivPaper[];
  totalResults: number;
}> {
  // 先尝试 arXiv（通过 CORS 代理）
  try {
    return await searchArxivDirect(params);
  } catch (e1: any) {
    console.warn("arXiv 搜索失败，尝试 Semantic Scholar:", e1.message);
    // 回退到 Semantic Scholar
    try {
      return await searchSemanticScholar(params);
    } catch (e2: any) {
      throw new Error(
        `论文搜索失败，两条路线均不可用：\n` +
        `- arXiv: ${e1.message}\n` +
        `- Semantic Scholar: ${e2.message}\n\n` +
        `请稍后重试或检查网络连接。`
      );
    }
  }
}
