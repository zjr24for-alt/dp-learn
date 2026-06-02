"use client";

import { QAChat } from "@/components/qa-chat";

export default function QAPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-zinc-900 mb-2">💬 智能问答</h1>
      <p className="text-zinc-500 mb-6">
        基于你的学习笔记 + DP/VASP/LAMMPS 官方文档回答问题。配置 DeepSeek API Key 可获得 AI 整合回答。
      </p>

      <QAChat />
    </div>
  );
}
