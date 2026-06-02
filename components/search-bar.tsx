"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { SearchIndexItem } from "@/lib/types";

interface Props {
  onSearch: (query: string) => SearchIndexItem[];
}

export function SearchBar({ onSearch }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchIndexItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleSearch = useCallback(
    (q: string) => {
      setQuery(q);
      if (q.trim().length > 0) {
        const r = onSearch(q);
        setResults(r);
        setIsOpen(true);
        setSelectedIdx(0);
      } else {
        setResults([]);
        setIsOpen(false);
      }
    },
    [onSearch]
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (!isOpen) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && results[selectedIdx]) {
        e.preventDefault();
        router.push(results[selectedIdx].url);
        setIsOpen(false);
        setQuery("");
      } else if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, results, selectedIdx, router]);

  const typeLabel = (type: string) => {
    switch (type) {
      case "article": return "📄";
      case "doc": return "🔗";
      case "cheatsheet": return "📋";
      default: return "📌";
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-lg">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder='搜索知识库... (Ctrl+K)'
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-zinc-300 bg-white text-sm
                     placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setIsOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-1 w-full bg-white border border-zinc-200 rounded-lg shadow-lg max-h-80 overflow-y-auto z-50">
          {results.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => {
                router.push(item.url);
                setIsOpen(false);
                setQuery("");
              }}
              className={`w-full text-left px-4 py-2.5 border-b border-zinc-100 last:border-b-0 text-sm
                ${idx === selectedIdx ? "bg-zinc-100" : "hover:bg-zinc-50"}`}
            >
              <div className="flex items-center gap-2">
                <span>{typeLabel(item.type)}</span>
                <span className="font-medium text-zinc-900 truncate">{item.title}</span>
                <span className="text-xs text-zinc-400 ml-auto shrink-0">{item.type === "doc" ? "官方" : item.category}</span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5 truncate">{item.content.slice(0, 100)}</p>
            </button>
          ))}
        </div>
      )}

      {isOpen && query && results.length === 0 && (
        <div className="absolute top-full mt-1 w-full bg-white border border-zinc-200 rounded-lg shadow-lg p-4 text-sm text-zinc-500 z-50">
          未找到相关结果，试试其他关键词
        </div>
      )}
    </div>
  );
}
