"use client";

import { useState, useMemo } from "react";
import { cheatsheetItems } from "@/content/index";
import type { CheatsheetItem } from "@/lib/types";
import { CopyButton } from "@/components/copy-button";

const CATEGORY_FILTERS = [
  { key: "all", label: "全部" },
  { key: "command", label: "命令" },
  { key: "param", label: "参数" },
  { key: "path", label: "路径" },
  { key: "script", label: "脚本" },
];

export default function CheatsheetPage() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchText, setSearchText] = useState("");

  const filtered = useMemo(() => {
    let items: CheatsheetItem[] = cheatsheetItems;
    if (activeFilter !== "all") {
      items = items.filter((i) => i.category === activeFilter);
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      items = items.filter(
        (i) =>
          i.label.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.code.toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return items;
  }, [activeFilter, searchText]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-zinc-900 mb-2">📋 速查表</h1>
      <p className="text-zinc-500 mb-6">命令、参数、路径一键复制</p>

      {/* Search */}
      <input
        id="cheatsheet-search"
        name="search"
        type="text"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        placeholder="筛选速查条目..."
        autoComplete="on"
        className="w-full max-w-md px-4 py-2 rounded-lg border border-zinc-300 text-sm
                   placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent mb-4"
      />

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {CATEGORY_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeFilter === f.key
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Items */}
      <div className="space-y-3">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="border border-zinc-200 rounded-xl p-4 bg-white hover:border-zinc-300 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-zinc-900 text-sm">{item.label}</h3>
                  <span className="text-xs bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded">
                    {item.category}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mb-2">{item.description}</p>
                <pre className="bg-zinc-50 rounded-md p-3 text-xs overflow-x-auto border border-zinc-100">
                  <code>{item.code}</code>
                </pre>
                <div className="flex items-center gap-1 mt-2">
                  {item.tags.map((tag) => (
                    <span key={tag} className="text-xs text-zinc-400">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
              <CopyButton text={item.code} />
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-zinc-400">
          <p>没有匹配的条目</p>
        </div>
      )}
    </div>
  );
}
