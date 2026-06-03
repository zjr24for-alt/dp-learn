"use client";

import { useState, useRef, useEffect } from "react";
import type { QASnippet } from "@/lib/search-qa";
import { retrieveRelevant, buildContext } from "@/lib/search-qa";
import { askAI, hasApiKey, setApiKey, clearApiKey, getApiKey } from "@/lib/ai-qa";
import { allArticles, cheatsheetItems, officialDocs } from "@/content/index";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  sources?: QASnippet[];
  mode?: "search-only" | "ai-enhanced";
}

export function QAChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "system",
      content: "你好！我是 DP 学习助教。你可以问我关于 DP-GEN、DeePMD、VASP、LAMMPS 的任何问题。\n\n我会先在知识库（你的笔记 + 官方文档）中检索相关内容，然后给你回答。\n\n💡 配置 DeepSeek API Key 可以获得更智能的整合回答。",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [keyConfigured, setKeyConfigured] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setKeyConfigured(hasApiKey());
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSaveKey = () => {
    if (apiKeyInput.trim()) {
      setApiKey(apiKeyInput.trim());
      setKeyConfigured(true);
      setShowKeyInput(false);
      setApiKeyInput("");
    }
  };

  const handleClearKey = () => {
    clearApiKey();
    setKeyConfigured(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const question = input.trim();
    setInput("");
    setLoading(true);

    // Add user message
    const userMsg: Message = { role: "user", content: question };
    setMessages((prev) => [...prev, userMsg]);

    // Retrieve relevant snippets
    const snippets = retrieveRelevant(question, allArticles, officialDocs, cheatsheetItems, 5);
    console.log("[QA] snippets:", snippets.length, "hasApiKey:", hasApiKey());

    if (snippets.length === 0 && !hasApiKey()) {
      console.log("[QA] 分支: 无结果+无Key → 提示");
      // 无知识库结果 + 无 AI → 提示用户
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "抱歉，我在知识库中没有找到与您问题相关的内容。\n\n💡 配置 DeepSeek API Key 后，即使知识库没有相关内容，AI 也可以基于自身知识回答。点击上方「⚙️ 配置 API Key」即可设置。",
          sources: [],
          mode: "search-only",
        },
      ]);
      setLoading(false);
      return;
    }

    // If API key is configured, use AI
    if (hasApiKey()) {
      console.log("[QA] 分支: AI增强 snippets=", snippets.length);
      const context = snippets.length > 0
        ? buildContext(snippets)
        : "（知识库中未找到相关内容，请基于你的训练知识回答）";

      const response = await askAI(question, context);
      console.log("[QA] AI response error:", response.error || "none");

      if (response.error) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `AI 调用失败: ${response.error}${snippets.length > 0 ? `\n\n以下为知识库检索结果：\n\n${snippets.map((s, i) => `**${i + 1}. ${s.title}**\n${s.snippet}\n${s.url ? `🔗 ${s.url}` : ""}`).join("\n\n")}` : ""}`,
            sources: snippets,
            mode: "search-only",
          },
        ]);
      } else {
        const sourceBlock = snippets.length > 0
          ? `\n\n---\n📚 **参考来源：**\n${snippets.map((s, i) => `- [${s.title}](${s.url || "#"}${s.isOfficial ? " (官方文档)" : ""})`).join("\n")}`
          : "\n\n---\n⚠️ *知识库中未找到相关内容，以上回答来自 AI 自身知识，请注意核实。*";

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: response.answer + sourceBlock,
            sources: snippets,
            mode: "ai-enhanced",
          },
        ]);
      }
    } else {
      // Search-only mode
      const answer = snippets
        .map((s, i) => `**${i + 1}. ${s.title}**\n${s.snippet}\n${s.url ? `🔗 [查看详情](${s.url})` : ""}`)
        .join("\n\n---\n\n");

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `以下是知识库中与您问题相关的内容（按相关度排序）：\n\n${answer}\n\n---\n💡 *配置 DeepSeek API Key 可获得 AI 整合回答*`,
          sources: snippets,
          mode: "search-only",
        },
      ]);
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col h-[600px] border border-zinc-200 rounded-xl bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">🤖 DP 学习助教</span>
          {keyConfigured ? (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
              🟢 AI 已启用
              <button onClick={handleClearKey} className="ml-1 hover:text-red-500" title="清除 API Key">×</button>
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
      </div>

      {/* API Key input */}
      {showKeyInput && (
        <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50">
          <div className="flex gap-2">
            <input
              id="api-key-input"
              name="apiKey"
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="输入 DeepSeek API Key (sk-...)"
              autoComplete="off"
              className="flex-1 px-3 py-1.5 text-sm border border-zinc-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
            <button
              onClick={handleSaveKey}
              className="px-3 py-1.5 text-sm bg-zinc-900 text-white rounded-md hover:bg-zinc-800"
            >
              保存
            </button>
          </div>
          <p className="text-xs text-zinc-400 mt-1">API Key 仅存储在浏览器本地，不会上传到任何服务器</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-zinc-900 text-white"
                  : msg.role === "system"
                  ? "bg-blue-50 text-blue-800 border border-blue-100"
                  : "bg-zinc-100 text-zinc-800"
              }`}
            >
              <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-a:text-blue-600"
                   dangerouslySetInnerHTML={{
                     __html: msg.content
                       .replace(/\n/g, "<br/>")
                       .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
                       .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
                       .replace(/`([^`]+)`/g, "<code>$1</code>"),
                   }}
              />
              {msg.mode === "ai-enhanced" && (
                <span className="inline-block mt-2 text-xs text-zinc-400">✨ AI 生成</span>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-zinc-100 rounded-xl px-4 py-3 text-sm text-zinc-500">
              <span className="inline-flex gap-1">
                <span className="animate-bounce">●</span>
                <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>●</span>
                <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>●</span>
              </span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-zinc-100 p-4">
        <div className="flex gap-2">
          <input
            id="qa-chat-input"
            name="question"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="问一个关于 DP-GEN / DeePMD / VASP / LAMMPS 的问题..."
            autoComplete="on"
            className="flex-1 px-4 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            发送
          </button>
        </div>
        <p className="text-xs text-zinc-400 mt-2">
          试试问："DP-GEN 的 candidate 比例多少算健康？" 或 "VASP 报 KPOINTS float bug 怎么办？"
        </p>
      </form>
    </div>
  );
}
