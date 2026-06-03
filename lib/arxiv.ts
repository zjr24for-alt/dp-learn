// 论文搜索客户端 — 三路容错
// 主路: arXiv API via 服务端代理
// 备路: Semantic Scholar API（浏览器直连 + 代理回退）
// 第三路: OpenAlex API（免费无认证，浏览器直连）

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
    // 代理返回 JSON 错误（429/502）
    let errMsg = `代理请求失败 (${res.status})`;
    try {
      const errData = await res.json();
      if (errData.error) errMsg = errData.error;
    } catch {}
    throw new Error(errMsg);
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

/** S2 请求 + 解析，优先浏览器直连（S2 支持 CORS），回退代理 */
async function fetchAndParseS2(externalUrl: string): Promise<{
  papers: ArxivPaper[];
  totalResults: number;
}> {
  let res: Response;
  const proxyUrl = `/api/semantic-scholar?${new URL(externalUrl).searchParams.toString()}`;

  // S2 支持 CORS，优先浏览器直连（用户 IP 不会被 Vercel 共享 IP 拖累）
  try {
    res = await fetch(externalUrl, { signal: AbortSignal.timeout(15_000) });
  } catch {
    // 浏览器直连失败（网络问题），回退代理
    try {
      res = await fetch(proxyUrl, { signal: AbortSignal.timeout(15_000) });
    } catch {
      throw new Error("Semantic Scholar 无法访问，请检查网络");
    }
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

// ====== OpenAlex API (第三路 — 免费无认证，浏览器直连) ======

const OPENALEX_API = "https://api.openalex.org/works";

async function searchOpenAlex(params: ArxivSearchParams): Promise<{
  papers: ArxivPaper[];
  totalResults: number;
}> {
  const perPage = Math.min(params.maxResults || 20, 50);
  const page = Math.floor((params.start || 0) / perPage) + 1;

  const url = new URL(OPENALEX_API);
  url.searchParams.set("search", params.query.trim());
  url.searchParams.set("per_page", String(perPage));
  url.searchParams.set("page", String(page));
  // 按相关性排序（默认），filter by concept if category specified
  if (params.category) {
    // OpenAlex concept mapping for arXiv categories
    const conceptMap: Record<string, string> = {
      "cond-mat.mtrl-sci": "C154945302",   // Materials Science
      "physics.comp-ph": "C191209702",      // Computational Physics
      "cs.LG": "C119857082",                // Machine Learning
      "physics.chem-ph": "C138885662",      // Physical Chemistry
    };
    const conceptId = conceptMap[params.category];
    if (conceptId) {
      url.searchParams.set("filter", `concepts.id:${conceptId}`);
    }
  }

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });

  if (res.status === 429) {
    throw new Error("OpenAlex 请求太频繁");
  }
  if (!res.ok) {
    throw new Error(`OpenAlex 请求失败 (${res.status})`);
  }

  const data = await res.json();
  const results = data.results || [];
  const totalResults = data.meta?.count || 0;

  const papers: ArxivPaper[] = results.map((w: any) => {
    const arxivId = w.ids?.arxiv_id
      ? w.ids.arxiv_id.replace(/^.*\//, "")
      : undefined;
    const doi = w.doi ? w.doi.replace("https://doi.org/", "") : undefined;
    const authors = (w.authorships || []).map((a: any) => a.author?.display_name || "").filter(Boolean);
    const year = w.publication_year?.toString() || "";
    const concepts = (w.concepts || []).map((c: any) => c.display_name);
    const primaryCategory = concepts[0] || "N/A";

    return {
      id: w.id?.replace("https://openalex.org/", "openalex:") || `oa:${Math.random()}`,
      title: w.title || "Untitled",
      summary: w.abstract || "暂无摘要",
      authors,
      published: year,
      categories: concepts,
      primaryCategory,
      pdfUrl: w.open_access?.oa_url || (arxivId ? `https://arxiv.org/pdf/${arxivId}` : "#"),
      abstractUrl: arxivId
        ? `https://arxiv.org/abs/${arxivId}`
        : w.id || "#",
      arxivId,
      doi,
      citationCount: w.cited_by_count,
      venue: w.primary_location?.source?.display_name || undefined,
    };
  });

  return { papers, totalResults };
}

// ====== 统一入口（三路容错） ======

export async function searchArxiv(params: ArxivSearchParams): Promise<{
  papers: ArxivPaper[];
  totalResults: number;
}> {
  // 并行尝试三条线路，取第一个成功的结果
  const [arxivResult, s2Result, oaResult] = await Promise.allSettled([
    searchArxivDirect(params),
    searchSemanticScholar(params),
    searchOpenAlex(params),
  ]);

  // arXiv 成功
  if (arxivResult.status === "fulfilled") {
    return arxivResult.value;
  }

  // Semantic Scholar 成功
  if (s2Result.status === "fulfilled") {
    return s2Result.value;
  }

  // OpenAlex 成功
  if (oaResult.status === "fulfilled") {
    return oaResult.value;
  }

  // 三条线路都失败
  const arxivErr = arxivResult.reason?.message || "未知错误";
  const s2Err = s2Result.reason?.message || "未知错误";
  const oaErr = oaResult.reason?.message || "未知错误";
  throw new Error(
    `论文搜索失败，三条路线均不可用：\n` +
    `- arXiv: ${arxivErr}\n` +
    `- Semantic Scholar: ${s2Err}\n` +
    `- OpenAlex: ${oaErr}\n\n` +
    `可能原因：网络问题或 API 限流，请稍后重试。`
  );
}
