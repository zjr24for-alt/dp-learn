"use client";

import { useState, useRef, useEffect } from "react";
import {
  searchArxiv,
  searchArxivDirect,
  searchSemanticScholar,
  searchOpenAlex,
  DP_PRESET_QUERIES,
  DP_CATEGORIES,
  type ArxivPaper,
  type SearchProgress,
} from "@/lib/arxiv";
import { renderMarkdown } from "@/lib/render-markdown";

// ====== AI 调用工具 ======

async function callAI(messages: { role: string; content: string }[]): Promise<string> {
  const apiKey = localStorage.getItem("dp_learn_deepseek_key");
  if (!apiKey) throw new Error("未配置 API Key");

  const res = await fetch("/api/ai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages,
      temperature: 0.3,
      max_tokens: 4096,
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.choices?.[0]?.message?.content || "（无回答）";
}

interface PaperCardProps {
  paper: ArxivPaper;
  index: number;
}

function PaperCard({ paper, index }: PaperCardProps) {
  return (
    <div className="border border-slate-200 rounded-lg p-3 bg-white hover:border-slate-300 transition-colors">
      <div className="flex items-start gap-3">
        <span className="text-xs font-mono text-slate-400 shrink-0 mt-0.5 w-5 text-right">[{index}]</span>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-slate-900 leading-snug mb-1">{paper.title}</h4>
          <div className="text-xs text-slate-500 line-clamp-1 mb-1.5">
            {paper.authors.slice(0, 3).join(", ")}{paper.authors.length > 3 ? " et al." : ""}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{paper.published}</span>
            {paper.venue && (
              <span className="text-[11px] text-slate-400 italic">{paper.venue}</span>
            )}
            {paper.citationCount !== undefined && (
              <span className="text-[11px] text-slate-400">被引 {paper.citationCount}</span>
            )}
            <span className="text-[11px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
              {paper.primaryCategory}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            {paper.arxivId && (
              <a href={`https://arxiv.org/abs/${paper.arxivId}`} target="_blank" rel="noopener"
                 className="text-xs px-2 py-0.5 bg-red-50 text-red-600 rounded hover:bg-red-100 font-medium">
                arXiv
              </a>
            )}
            {paper.pdfUrl && paper.pdfUrl !== "#" && (
              <a href={paper.pdfUrl} target="_blank" rel="noopener"
                 className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 font-medium">
                PDF
              </a>
            )}
            {paper.doi && (
              <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noopener"
                 className="text-xs text-slate-400 hover:text-blue-500 underline">
                DOI
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ====== 主组件 ======

interface Message {
  role: "user" | "assistant";
  content: string;
  papers?: ArxivPaper[];
}

export function PaperChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `你好！我是 **DP 论文助手**，按 MatChat 模式帮你检索材料科学论文。

**用法示例：**
- *"DP-GEN 主动学习在高熵合金中的应用"*
- *"使用 DeePMD 研究二维材料力学性能"*
- *"钙钛矿太阳能电池稳定性最新进展"*
- *"LAMMPS + DeePMD 集成方法综述"*

💡 **配置 DeepSeek API Key** 后，搜索到的论文会由 AI 分析总结，给出带引用的综合回答。`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<SearchProgress[]>([]);
  const [showClassicSearch, setShowClassicSearch] = useState(false);
  const [classicQuery, setClassicQuery] = useState("");
  const [classicCategory, setClassicCategory] = useState("");
  const [classicPapers, setClassicPapers] = useState<ArxivPaper[]>([]);
  const [classicLoading, setClassicLoading] = useState(false);
  const [classicError, setClassicError] = useState("");
  const [selectedPaper, setSelectedPaper] = useState<ArxivPaper | null>(null);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [keyConfigured, setKeyConfigured] = useState(false);
  const [searchMode, setSearchMode] = useState<"chat" | "classic">("chat");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setKeyConfigured(!!localStorage.getItem("dp_learn_deepseek_key"));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, progress]);

  const handleSaveKey = () => {
    if (apiKeyInput.trim()) {
      localStorage.setItem("dp_learn_deepseek_key", apiKeyInput.trim());
      setKeyConfigured(true);
      setShowKeyInput(false);
      setApiKeyInput("");
    }
  };

  const handleClearKey = () => {
    localStorage.removeItem("dp_learn_deepseek_key");
    setKeyConfigured(false);
  };

  /** AI 分析搜索关键词 → 检索 → AI 总结 */
  const handleChatSearch = async (question: string) => {
    setLoading(true);
    setProgress([]);

    // 添加用户消息
    const userMsg: Message = { role: "user", content: question };
    setMessages((prev) => [...prev, userMsg]);

    // 步骤 1: AI 生成搜索关键词
    let searchQuery = question;
    if (keyConfigured) {
      try {
        const keywordResponse = await callAI([
          {
            role: "system",
            content: `你是一个材料科学论文检索助手。用户会问一个研究问题，请提取最适合搜索引擎的英文关键词（不要回答问题，只返回关键词）。

规则：
- 返回 2-4 个英文关键词/短语，用逗号分隔
- 关键词要覆盖用户问题的核心概念
- 适合用于 arXiv / Semantic Scholar / OpenAlex 搜索

示例：
用户：DP-GEN 主动学习在高熵合金中的应用
→ deep potential, active learning, high entropy alloy

用户：DeePMD 在二维材料力学中的应用
→ deepmd, 2D materials, mechanical properties, neural network potential

用户：钙钛矿太阳能电池稳定性
→ perovskite solar cell, stability, degradation mechanism`,
          },
          { role: "user", content: question },
        ]);
        searchQuery = keywordResponse.trim();
      } catch {
        // AI 失败则直接用原问题搜索
      }
    }

    // 步骤 2: 并行搜索（三路）
    const allPapers: ArxivPaper[] = [];
    const errors: string[] = [];
    const seen = new Set<string>();

    const sources = [
      { name: "arXiv", fn: () => searchArxivDirect({ query: searchQuery, maxResults: 15 }) },
      { name: "Semantic Scholar", fn: () => searchSemanticScholar({ query: searchQuery, maxResults: 10 }) },
      { name: "OpenAlex", fn: () => searchOpenAlex({ query: searchQuery, maxResults: 15 }) },
    ];

    const updateProgress = (name: string, status: "searching" | "done" | "failed", count?: number) => {
      setProgress((prev) => {
        const idx = prev.findIndex((p) => p.source === name);
        const p: SearchProgress = { source: name, status, count };
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = p;
          return next;
        }
        return [...prev, p];
      });
    };

    await Promise.all(
      sources.map(async (s) => {
        updateProgress(s.name, "searching");
        try {
          const result = await s.fn();
          updateProgress(s.name, "done", result.papers.length);
          for (const paper of result.papers) {
            const key = paper.arxivId || paper.doi || paper.id;
            if (!seen.has(key) && paper.title !== "Untitled" && paper.summary !== "暂无摘要") {
              seen.add(key);
              allPapers.push(paper);
            }
          }
        } catch (e: any) {
          updateProgress(s.name, "failed");
          errors.push(e.message);
        }
      })
    );

    // 去重排序：有引文数的优先
    allPapers.sort((a, b) => (b.citationCount || 0) - (a.citationCount || 0));
    const topPapers = allPapers.slice(0, 20);

    if (topPapers.length === 0) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `抱歉，没有搜索到相关论文。\n\n可能原因：\n- 关键词不够精确\n- API 限流\n\n请尝试换一种表述重新提问。`,
          papers: [],
        },
      ]);
      setLoading(false);
      return;
    }

    // 步骤 3: AI 总结（如果有 API Key）
    if (keyConfigured) {
      const paperContext = topPapers
        .map((p, i) => {
          return `[${i + 1}] ${p.title}
作者: ${p.authors.slice(0, 5).join(", ")}
年份: ${p.published}
期刊: ${p.venue || "N/A"}
被引: ${p.citationCount ?? "N/A"}
摘要: ${p.summary.replace(/\s+/g, " ").trim().slice(0, 800)}
arXiv: ${p.arxivId ? `https://arxiv.org/abs/${p.arxivId}` : "N/A"}
DOI: ${p.doi ? `https://doi.org/${p.doi}` : "N/A"}`;
        })
        .join("\n\n---\n\n");

      let aiAnswer = "";
      try {
        aiAnswer = await callAI([
          {
            role: "system",
            content: `你是一个材料科学论文分析专家。用户提出了一个研究问题，我们已搜索到以下相关论文。

请完成以下任务：
1. **综合回答**用户的问题，引用搜索到的论文（用 [1], [2] 等编号引用）
2. **分析研究趋势**：这些论文反映了什么研究趋势？有哪些主流方法？
3. **指出关键发现**：如果有特别重要的论文或突破性发现，突出说明

格式要求：
- 使用中文回答
- 引用论文请用 [1], [2] 格式，同一篇论文始终使用同一编号
- 回答结束时列出所有引用编号对应的论文标题和链接
- 保持专业、简洁、有深度`,
          },
          { role: "user", content: `用户问题：${question}\n\n搜索到的论文列表：\n\n${paperContext}` },
        ]);
      } catch (e: any) {
        aiAnswer = `AI 分析失败: ${e.message}`;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: aiAnswer,
          papers: topPapers,
        },
      ]);
    } else {
      // 无 API Key：直接展示论文列表
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `搜索到 ${topPapers.length} 篇相关论文（已去重）。\n\n💡 配置 DeepSeek API Key 后，AI 会自动分析这些论文并给出综合回答。`,
          papers: topPapers,
        },
      ]);
    }

    setLoading(false);
  };

  /** 经典搜索（保留作为备选） */
  const handleClassicSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classicQuery.trim() || classicLoading) return;
    setClassicLoading(true);
    setClassicError("");
    setProgress([]);

    try {
      const result = await searchArxiv(
        {
          query: classicQuery.trim(),
          maxResults: 20,
          category: classicCategory || undefined,
          sortBy: "relevance",
          sortOrder: "descending",
        },
        (p) => setProgress((prev) => {
          const idx = prev.findIndex((x) => x.source === p.source);
          if (idx >= 0) { const next = [...prev]; next[idx] = p; return next; }
          return [...prev, p];
        }),
      );
      setClassicPapers(result.papers);
    } catch (err: any) {
      setClassicError(err.message || "搜索失败");
    } finally {
      setClassicLoading(false);
    }
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    handleChatSearch(input.trim());
    setInput("");
  };

  const handlePreset = (query: string) => {
    setInput(query);
    handleChatSearch(query);
  };

  return (
    <div className="space-y-4">
      {/* 模式切换 */}
      <div className="flex items-center gap-2 border-b border-zinc-200 pb-3">
        <button
          onClick={() => setSearchMode("chat")}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            searchMode === "chat"
              ? "bg-zinc-900 text-white"
              : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100"
          }`}
        >
          🤖 AI 问答模式
        </button>
        <button
          onClick={() => setSearchMode("classic")}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            searchMode === "classic"
              ? "bg-zinc-900 text-white"
              : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100"
          }`}
        >
          📋 经典搜索
        </button>
        <div className="flex-1" />
        {keyConfigured ? (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
            🟢 AI 已启用
            <button onClick={handleClearKey} className="ml-1 hover:text-red-500" title="清除 Key">×</button>
          </span>
        ) : (
          <button
            onClick={() => setShowKeyInput(!showKeyInput)}
            className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full hover:bg-zinc-200"
          >
            ⚙️ 配置 API Key
          </button>
        )}
      </div>

      {/* API Key 配置 */}
      {showKeyInput && (
        <div className="p-4 border border-zinc-200 rounded-xl bg-zinc-50">
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="输入 DeepSeek API Key (sk-...)"
              autoComplete="off"
              className="flex-1 px-3 py-1.5 text-sm border border-zinc-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white"
              style={{ backgroundColor: "#fff", color: "#18181b" }}
            />
            <button
              onClick={handleSaveKey}
              className="px-3 py-1.5 text-sm bg-zinc-900 text-white rounded-md hover:bg-zinc-800"
            >
              保存
            </button>
          </div>
          <p className="text-xs text-zinc-400 mt-1">API Key 仅存储在浏览器本地</p>
        </div>
      )}

      {/* ====== AI 问答模式 ====== */}
      {searchMode === "chat" && (
        <>
          {/* 预设问题 */}
          <div className="flex gap-2 flex-wrap">
            {DP_PRESET_QUERIES.slice(0, 8).map((pq) => (
              <button
                key={pq.label}
                type="button"
                onClick={() => handlePreset(pq.query)}
                disabled={loading}
                className="px-3 py-1 text-xs font-medium rounded-full border border-zinc-200 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 transition-colors disabled:opacity-50"
              >
                {pq.label}
              </button>
            ))}
          </div>

          {/* 对话区 */}
          <div className="border border-zinc-200 rounded-xl bg-white min-h-[400px] flex flex-col">
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 max-h-[500px]">
              {messages.map((msg, idx) => (
                <div key={idx}>
                  <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[88%] rounded-xl px-4 py-3 text-sm ${
                        msg.role === "user"
                          ? "bg-blue-100 text-blue-900"
                          : "bg-zinc-100 text-zinc-800"
                      }`}
                    >
                      <div
                        className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-a:text-blue-600 prose-code:text-xs"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                      />
                    </div>
                  </div>

                  {/* 论文卡片 */}
                  {msg.papers && msg.papers.length > 0 && (
                    <div className="mt-2 ml-4 space-y-2">
                      <p className="text-xs font-medium text-zinc-400 flex items-center gap-1">
                        📄 共 {msg.papers.length} 篇相关论文
                      </p>
                      {msg.papers.map((paper, pi) => (
                        <PaperCard key={paper.id} paper={paper} index={pi + 1} />
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* 搜索进度 */}
              {loading && (
                <div className="space-y-3 bg-zinc-50 border border-zinc-200 rounded-xl p-4">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                    </div>
                    <span className="text-sm font-medium text-zinc-700">正在搜索论文...</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {["arXiv", "Semantic Scholar", "OpenAlex"].map((name) => {
                      const p = progress.find((x) => x.source === name);
                      if (!p || p.status === "searching") {
                        return (
                          <span key={name} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                            {name} 搜索中...
                          </span>
                        );
                      }
                      if (p.status === "done") {
                        return (
                          <span key={name} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-green-50 text-green-600 border border-green-100">
                            ✓ {name} {p.count} 篇
                          </span>
                        );
                      }
                      return (
                        <span key={name} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-500 border border-red-100">
                          ✕ {name} 失败
                        </span>
                      );
                    })}
                    {/* AI 分析阶段 */}
                    {keyConfigured && progress.some((p) => p.status === "done") && (
                      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-purple-50 text-purple-600 border border-purple-100">
                        <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />
                        AI 分析中...
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div ref={endRef} />
            </div>

            {/* 输入框 */}
            <form onSubmit={handleChatSubmit} className="border-t border-zinc-100 p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="输入论文检索问题，如：DP-GEN 主动学习在高熵合金中的应用"
                  autoComplete="off"
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent bg-white"
                  style={{ backgroundColor: "#fff", color: "#18181b" }}
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="px-5 py-2.5 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 disabled:opacity-50 transition-colors"
                >
                  {loading ? "搜索中..." : "🔍 检索"}
                </button>
              </div>
              <p className="text-xs text-zinc-400 mt-2">
                AI 自动生成搜索关键词 → 三路检索（arXiv + Semantic Scholar + OpenAlex）→ AI 分析总结
                {!keyConfigured && " · 💡 配置 API Key 可启用 AI 分析"}
              </p>
            </form>
          </div>
        </>
      )}

      {/* ====== 经典搜索模式 ====== */}
      {searchMode === "classic" && (
        <div className="space-y-4">
          <form onSubmit={handleClassicSearch} className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={classicQuery}
                onChange={(e) => setClassicQuery(e.target.value)}
                placeholder="搜索 arXiv 论文..."
                autoComplete="on"
                className="flex-1 px-4 py-2.5 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent bg-white"
                style={{ backgroundColor: "#fff", color: "#18181b" }}
              />
              <button
                type="submit"
                disabled={classicLoading || !classicQuery.trim()}
                className="px-5 py-2.5 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 disabled:opacity-50 transition-colors shrink-0"
              >
                {classicLoading ? "搜索中..." : "🔍 搜索"}
              </button>
            </div>
            <select
              value={classicCategory}
              onChange={(e) => setClassicCategory(e.target.value)}
              className="px-3 py-1.5 border border-zinc-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
            >
              {DP_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </form>

          {/* 经典模式下的加载进度 */}
          {classicLoading && progress.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {["arXiv", "Semantic Scholar", "OpenAlex"].map((name) => {
                const p = progress.find((x) => x.source === name);
                if (!p || p.status === "searching") {
                  return (
                    <span key={name} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                      {name} 搜索中...
                    </span>
                  );
                }
                if (p.status === "done") {
                  return (
                    <span key={name} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-green-50 text-green-600 border border-green-100">
                      ✓ {name} {p.count} 篇
                    </span>
                  );
                }
                return (
                  <span key={name} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-500 border border-red-100">
                    ✕ {name} 失败
                  </span>
                );
              })}
            </div>
          )}

          {classicError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{classicError}</div>
          )}

          {classicPapers.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-zinc-500">显示 {classicPapers.length} 篇论文</p>
              {classicPapers.map((paper) => {
                const isSelected = selectedPaper?.id === paper.id;
                return (
                  <div key={paper.id} className={`border rounded-xl transition-all ${isSelected ? "border-zinc-400 bg-zinc-50" : "border-zinc-200 bg-white"}`}>
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <button onClick={() => setSelectedPaper(isSelected ? null : paper)} className="shrink-0 mt-0.5 text-zinc-400 hover:text-zinc-600">
                          <svg className={`w-4 h-4 transition-transform ${isSelected ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-zinc-900 text-sm leading-relaxed">{paper.title}</h3>
                            <div className="flex items-center gap-1 shrink-0">
                              <a href={paper.pdfUrl} target="_blank" rel="noopener" className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100 font-medium">PDF</a>
                              <a href={paper.abstractUrl} target="_blank" rel="noopener" className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 font-medium">arXiv</a>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 text-xs text-zinc-400 flex-wrap">
                            <span>{paper.authors.slice(0, 3).join(", ")}{paper.authors.length > 3 ? " et al." : ""}</span>
                            <span>·</span>
                            <span>{paper.published}</span>
                            {paper.venue && (<><span>·</span><span className="text-zinc-500 italic">{paper.venue}</span></>)}
                            <span>·</span>
                            <span className="bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-500">{paper.primaryCategory}</span>
                            {paper.citationCount !== undefined && (<><span>·</span><span className="text-zinc-500">被引 {paper.citationCount}</span></>)}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="mt-4 pt-4 border-t border-zinc-100">
                          <h4 className="text-xs font-medium text-zinc-500 mb-2">摘要</h4>
                          <p className="text-sm text-zinc-600 leading-relaxed">{paper.summary}</p>
                          {paper.doi && (
                            <p className="mt-2 text-xs text-zinc-400">DOI: <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noopener" className="text-blue-500 hover:underline">{paper.doi}</a></p>
                          )}
                          <div className="mt-3 text-xs text-zinc-400">完整作者: {paper.authors.join(", ")}</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!classicLoading && classicPapers.length === 0 && !classicError && (
            <div className="text-center py-16 text-zinc-400">
              <div className="text-4xl mb-4">📄</div>
              <p className="text-lg">搜索 arXiv 上的 DP/MLP 相关论文</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
