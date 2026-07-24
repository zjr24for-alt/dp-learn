import { PaperChat } from "@/components/paper-chat";

export default function PapersPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-zinc-900 mb-2">📄 论文检索</h1>
      <p className="text-zinc-500 mb-6">
        MatChat 模式：用自然语言提问，AI 自动检索 arXiv / Semantic Scholar / OpenAlex 三路论文来源，分析总结并给出带引用的回答。
      </p>

      <PaperChat />
    </div>
  );
}
