import { PaperSearch } from "@/components/paper-search";

export default function PapersPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-zinc-900 mb-2">📄 论文检索</h1>
      <p className="text-zinc-500 mb-6">
        搜索 arXiv 上与 Deep Potential、机器学习势函数、DP-GEN、VASP 相关的论文。
        <br />
        <span className="text-xs text-zinc-400">
          使用 arXiv 官方 API，无需密钥。点击标题展开摘要，可加入阅读列表追踪进度。
        </span>
      </p>

      <PaperSearch />
    </div>
  );
}
