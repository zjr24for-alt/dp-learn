/** 估算中文/英文混排文章的阅读时间 */
export function readingTime(text: string): number {
  const chineseChars = (text.match(/[一-鿿]/g) || []).length;
  const words = text.split(/\s+/).filter(Boolean).length;
  // 中文 ~300 字/分钟，英文 ~200 词/分钟
  const minutes = Math.ceil(chineseChars / 300 + words / 200);
  return Math.max(1, minutes);
}

export function ReadingTimeLabel({ text }: { text: string }) {
  return (
    <span className="text-xs text-zinc-400">
      预计阅读 {readingTime(text)} 分钟
    </span>
  );
}
