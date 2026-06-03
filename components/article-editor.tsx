"use client";

import { useState, useMemo } from "react";
import { CATEGORY_META, type Category, type Article } from "@/lib/types";
import { saveUserArticle } from "@/lib/user-content-store";
import { renderMarkdown } from "@/lib/render-markdown";
import { useRouter } from "next/navigation";

interface Props {
  initialArticle?: Article;
  onSaved?: (article: Article) => void;
}

export function ArticleEditor({ initialArticle, onSaved }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initialArticle?.title || "");
  const [category, setCategory] = useState<Category>(
    initialArticle?.category || "methodology"
  );
  const [summary, setSummary] = useState(initialArticle?.summary || "");
  const [tagsInput, setTagsInput] = useState(initialArticle?.tags.join(", ") || "");
  const [content, setContent] = useState(initialArticle?.content || "");
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const previewHtml = useMemo(() => renderMarkdown(content), [content]);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      alert("标题和内容不能为空");
      return;
    }
    setSaving(true);
    try {
      const tags = tagsInput
        .split(/[,，]/)
        .map((t) => t.trim())
        .filter(Boolean);
      const saved = await saveUserArticle({
        slug: initialArticle?.slug,
        title: title.trim(),
        category,
        summary: summary.trim() || title.trim(),
        content,
        tags,
        createdAt: initialArticle?.createdAt,
      });
      onSaved?.(saved);
      router.push(`/learn/${saved.slug}`);
    } catch (err) {
      alert("保存失败：" + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">标题</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="文章标题"
          className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-zinc-900"
        />
      </div>

      {/* 分类 */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">分类</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
          className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-zinc-900 bg-white"
        >
          {Object.entries(CATEGORY_META).map(([key, meta]) => (
            <option key={key} value={key}>
              {meta.icon} {meta.label}
            </option>
          ))}
        </select>
      </div>

      {/* 摘要 */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">摘要</label>
        <input
          type="text"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="一句话描述（可选，留空则使用标题）"
          className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-zinc-900"
        />
      </div>

      {/* 标签 */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          标签 <span className="text-zinc-400 font-normal">（逗号分隔）</span>
        </label>
        <input
          type="text"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="DeePMD, VASP, 超算"
          className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-zinc-900"
        />
      </div>

      {/* 内容编辑 + 预览切换 */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-zinc-700">内容</label>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="text-xs text-blue-600 hover:underline"
          >
            {showPreview ? "📝 编辑" : "👁️ 预览"}
          </button>
        </div>

        {showPreview ? (
          <div
            className="prose prose-zinc max-w-none border border-zinc-200 rounded-lg p-4 min-h-[400px] bg-white"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`# 标题\n\n正文内容，支持 Markdown 语法。\n\n## 二级标题\n\n- 列表项\n- 列表项\n\n\`\`\`bash\n# 代码块\nls -la\n\`\`\``}
            rows={20}
            className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-zinc-900 font-mono text-sm leading-relaxed resize-y"
          />
        )}
      </div>

      {/* 保存按钮 */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving || !title.trim() || !content.trim()}
          className="px-6 py-2.5 bg-zinc-900 text-white rounded-lg font-medium text-sm hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "保存中..." : initialArticle ? "更新笔记" : "保存笔记"}
        </button>
        <span className="text-xs text-zinc-400">
          保存后将自动跳转到文章页面
        </span>
      </div>
    </div>
  );
}
