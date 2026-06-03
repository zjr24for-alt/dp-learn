"use client";

import { useState, useCallback } from "react";
import { searchArxiv, DP_CATEGORIES, DP_PRESET_QUERIES, type ArxivPaper } from "@/lib/arxiv";
import {
  addToReadingList,
  removeFromReadingList,
  toggleRead,
  isInReadingList,
  getReadingList,
  type ReadingListItem,
} from "@/lib/reading-list";

export function PaperSearch() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [papers, setPapers] = useState<ArxivPaper[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [totalResults, setTotalResults] = useState(0);
  const [readingList, setReadingList] = useState<ReadingListItem[]>([]);
  const [showReadingList, setShowReadingList] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState<ArxivPaper | null>(null);

  const refreshReadingList = useCallback(() => {
    setReadingList(getReadingList());
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError("");

    try {
      const result = await searchArxiv({
        query: query.trim(),
        maxResults: 20,
        category: category || undefined,
        sortBy: "relevance",
        sortOrder: "descending",
      });
      setPapers(result.papers);
      setTotalResults(result.totalResults);
      refreshReadingList();
    } catch (err: any) {
      setError(err.message || "搜索失败");
      setPapers([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePreset = (presetQuery: string) => {
    setQuery(presetQuery);
    // Auto-search with preset
    setTimeout(async () => {
      setLoading(true);
      try {
        const result = await searchArxiv({
          query: presetQuery,
          maxResults: 20,
          category: category || undefined,
          sortBy: "relevance",
        });
        setPapers(result.papers);
        setTotalResults(result.totalResults);
        refreshReadingList();
      } catch (err: any) {
        setError(err.message || "搜索失败");
      } finally {
        setLoading(false);
      }
    }, 50);
  };

  return (
    <div className="space-y-6">
      {/* Search form */}
      <form onSubmit={handleSearch} className="space-y-3">
        <div className="flex gap-2">
          <input
            id="paper-search-query"
            name="query"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索 arXiv 论文（如 deep potential molecular dynamics）..."
            autoComplete="on"
            className="flex-1 px-4 py-2.5 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent bg-white"
            style={{ backgroundColor: "#fff", color: "#18181b" }}
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-5 py-2.5 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 disabled:opacity-50 transition-colors shrink-0"
          >
            {loading ? "搜索中..." : "🔍 搜索"}
          </button>
        </div>

        {/* Filters row */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            id="paper-search-category"
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            autoComplete="on"
            className="px-3 py-1.5 border border-zinc-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
          >
            {DP_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              setShowReadingList(!showReadingList);
              refreshReadingList();
            }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              showReadingList
                ? "bg-zinc-900 text-white"
                : "border border-zinc-300 text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            📚 阅读列表 ({readingList.length})
          </button>
        </div>

        {/* Preset queries */}
        <div className="flex gap-2 flex-wrap">
          {DP_PRESET_QUERIES.map((pq) => (
            <button
              key={pq.label}
              type="button"
              onClick={() => handlePreset(pq.query)}
              className="px-3 py-1 text-xs font-medium rounded-full border border-zinc-200 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
            >
              {pq.label}
            </button>
          ))}
        </div>
      </form>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Reading list panel */}
      {showReadingList && (
        <div className="border border-zinc-200 rounded-xl p-4 bg-zinc-50">
          <h3 className="font-semibold text-zinc-900 mb-3">📚 我的阅读列表</h3>
          {readingList.length === 0 ? (
            <p className="text-sm text-zinc-400">还没有添加论文，搜索后点击"加入阅读"即可</p>
          ) : (
            <div className="space-y-2">
              {readingList.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 text-sm bg-white border border-zinc-200 rounded-lg px-3 py-2"
                >
                  <button
                    onClick={() => {
                      const isRead = toggleRead(item.id);
                      refreshReadingList();
                    }}
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                      item.read
                        ? "bg-green-500 border-green-500 text-white"
                        : "border-zinc-300 hover:border-green-400"
                    }`}
                  >
                    {item.read && (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <a
                    href={`https://arxiv.org/abs/${item.id}`}
                    target="_blank"
                    rel="noopener"
                    className={`flex-1 truncate hover:text-blue-600 ${item.read ? "text-zinc-400 line-through" : "text-zinc-700"}`}
                  >
                    {item.title}
                  </a>
                  <span className="text-xs text-zinc-400 shrink-0">{item.id}</span>
                  <button
                    onClick={() => {
                      removeFromReadingList(item.id);
                      refreshReadingList();
                    }}
                    className="text-zinc-400 hover:text-red-500 text-xs shrink-0"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {papers.length > 0 && (
        <div>
          <p className="text-sm text-zinc-500 mb-3">
            找到约 {totalResults} 篇论文（显示前 {papers.length} 篇）
          </p>
          <div className="space-y-3">
            {papers.map((paper) => {
              const inList = isInReadingList(paper.id);
              const listItem = readingList.find((r) => r.id === paper.id);
              const isSelected = selectedPaper?.id === paper.id;

              return (
                <div
                  key={paper.id}
                  className={`border rounded-xl transition-all ${
                    isSelected ? "border-zinc-400 bg-zinc-50" : "border-zinc-200 bg-white"
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Select to read */}
                      <button
                        onClick={() => setSelectedPaper(isSelected ? null : paper)}
                        className="shrink-0 mt-0.5 text-zinc-400 hover:text-zinc-600"
                        title="展开阅读摘要"
                      >
                        <svg className={`w-4 h-4 transition-transform ${isSelected ? "rotate-90" : ""}`}
                             fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-zinc-900 text-sm leading-relaxed">
                            {paper.title}
                          </h3>
                          <div className="flex items-center gap-1 shrink-0">
                            <a
                              href={paper.pdfUrl}
                              target="_blank"
                              rel="noopener"
                              className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100 font-medium"
                            >
                              PDF
                            </a>
                            <a
                              href={paper.abstractUrl}
                              target="_blank"
                              rel="noopener"
                              className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 font-medium"
                            >
                              arXiv
                            </a>
                            <button
                              onClick={() => {
                                if (inList) {
                                  removeFromReadingList(paper.id);
                                } else {
                                  addToReadingList({ id: paper.id, title: paper.title });
                                }
                                refreshReadingList();
                              }}
                              className={`px-2 py-1 text-xs rounded font-medium ${
                                inList
                                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                                  : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                              }`}
                              title={inList ? "已加入阅读列表" : "加入阅读列表"}
                            >
                              {inList ? "✓ 已加入" : "+ 阅读"}
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-1.5 text-xs text-zinc-400 flex-wrap">
                          <span>{paper.authors.slice(0, 3).join(", ")}{paper.authors.length > 3 ? " et al." : ""}</span>
                          <span>·</span>
                          <span>{paper.published}</span>
                          {paper.venue && (
                            <>
                              <span>·</span>
                              <span className="text-zinc-500 italic">{paper.venue}</span>
                            </>
                          )}
                          <span>·</span>
                          <span className="bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-500">
                            {paper.primaryCategory}
                          </span>
                          {paper.citationCount !== undefined && (
                            <>
                              <span>·</span>
                              <span className="text-zinc-500">被引 {paper.citationCount} 次</span>
                            </>
                          )}
                          {paper.arxivId && (
                            <>
                              <span>·</span>
                              <span className="text-zinc-400">arXiv:{paper.arxivId}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded abstract */}
                    {isSelected && (
                      <div className="mt-4 pt-4 border-t border-zinc-100">
                        <h4 className="text-xs font-medium text-zinc-500 mb-2">摘要</h4>
                        <p className="text-sm text-zinc-600 leading-relaxed">{paper.summary}</p>
                        {paper.doi && (
                          <p className="mt-2 text-xs text-zinc-400">
                            DOI: <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noopener" className="text-blue-500 hover:underline">{paper.doi}</a>
                          </p>
                        )}
                        <div className="mt-3 text-xs text-zinc-400">
                          完整作者: {paper.authors.join(", ")}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && papers.length === 0 && !error && (
        <div className="text-center py-16 text-zinc-400">
          <div className="text-4xl mb-4">📄</div>
          <p className="text-lg">搜索 arXiv 上的 DP/MLP 相关论文</p>
          <p className="text-sm mt-2">上方预设关键词可以快速开始</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-16">
          <div className="inline-flex gap-1.5">
            <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" />
            <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
            <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
          </div>
          <p className="text-sm text-zinc-400 mt-3">正在搜索 arXiv...</p>
        </div>
      )}
    </div>
  );
}
