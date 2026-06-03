export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-16 text-center">
      <div className="inline-flex gap-1.5">
        <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" />
        <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
        <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
      </div>
      <p className="text-sm text-zinc-400 mt-3">加载中...</p>
    </div>
  );
}
