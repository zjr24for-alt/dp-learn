/**
 * 自定义 Markdown → HTML 渲染器
 * 支持：标题、代码块、表格、引用、列表、粗体、行内代码、链接、水平线
 */
export function renderMarkdown(content: string): string {
  // Step 0: Extract code blocks to protect them from further processing
  const codeBlocks: string[] = [];
  let text = content.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const idx = codeBlocks.length;
    const escaped = code
      .trim()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
    const langLabel = lang
      ? `<span class="text-xs text-zinc-500">${lang}</span>`
      : "";
    codeBlocks.push(
      `<div class="relative group mb-5"><div class="flex items-center justify-between bg-zinc-300 rounded-t-lg px-4 py-1.5">${langLabel}</div><pre class="bg-zinc-200 rounded-b-lg p-4 overflow-x-auto text-sm border border-zinc-300 border-t-0"><code class="text-zinc-900 text-sm">${escaped}</code></pre><button class="copy-btn absolute top-2 right-2 p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors opacity-0 group-hover:opacity-100" data-code="${escaped}" title="复制代码"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg></button></div>`
    );
    return `%%CODEBLOCK_${idx}%%`;
  });

  // Step 1: Convert markdown tables to HTML
  text = text.replace(
    /(?:^\|(.+)\|\n)^\|(?:[-: |]+)\|\n((?:^\|.+\|\n?)+)/gm,
    (_, header, body) => {
      const headers = header.split("|").map((h: string) => h.trim());
      const rows = body
        .trim()
        .split("\n")
        .map((row: string) =>
          row
            .split("|")
            .filter((c: string) => c)
            .map((c: string) => c.trim())
        );
      const thead = `<tr>${headers
        .map(
          (h: string) =>
            `<th class="border border-zinc-300 bg-zinc-200 px-3 py-2 text-left text-sm font-semibold text-zinc-900">${h}</th>`
        )
        .join("")}</tr>`;
      const tbody = rows
        .map(
          (r: string[]) =>
            `<tr>${r
              .map(
                (c: string) =>
                  `<td class="border border-zinc-200 px-3 py-2 text-sm text-zinc-900">${c}</td>`
              )
              .join("")}</tr>`
        )
        .join("");
      return `<div class="overflow-x-auto mb-5"><table class="w-full border-collapse border border-zinc-200 rounded-lg">${thead}${tbody}</table></div>`;
    }
  );

  // Step 2: Headings, blockquotes, lists, hr, links
  text = text
    .replace(
      /^### (.+)$/gm,
      '<h3 class="text-lg font-semibold mt-8 mb-3 text-zinc-900">$1</h3>'
    )
    .replace(
      /^## (.+)$/gm,
      '<h2 class="text-xl font-bold mt-10 mb-4 text-zinc-900 border-b border-zinc-200 pb-2">$1</h2>'
    )
    .replace(
      /^# (.+)$/gm,
      '<h1 class="text-2xl font-bold mt-10 mb-5 text-zinc-900">$1</h1>'
    )
    .replace(
      /^> (.+)$/gm,
      '<blockquote class="border-l-4 border-zinc-400 bg-zinc-50 pl-4 py-2 my-4 text-zinc-700">$1</blockquote>'
    )
    .replace(/^---$/gm, '<hr class="my-8 border-zinc-300">')
    .replace(
      /^- (.+)$/gm,
      '<li class="ml-5 list-disc text-zinc-900 leading-relaxed">$1</li>'
    )
    .replace(
      /^(\d+)\. (.+)$/gm,
      '<li class="ml-5 list-decimal text-zinc-900 leading-relaxed">$2</li>'
    );

  // Step 3: Inline formatting (bold, inline code, links)
  text = text
    .replace(
      /`([^`]+)`/g,
      '<code class="bg-zinc-200 text-zinc-900 px-1.5 py-0.5 rounded text-sm font-medium">$1</code>'
    )
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" class="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>'
    )
    .replace(
      /\*\*([^*]+)\*\*/g,
      '<strong class="font-semibold text-zinc-900">$1</strong>'
    );

  // Step 4: Paragraphs — double newline = paragraph break
  text = text
    .replace(/\n\n+/g, '</p><p class="text-zinc-900 leading-relaxed mb-4">')
    .replace(/\n/g, "<br/>");

  // Wrap in initial paragraph
  text = '<p class="text-zinc-900 leading-relaxed mb-4">' + text + "</p>";

  // Step 5: Restore code blocks
  text = text.replace(
    /%%CODEBLOCK_(\d+)%%/g,
    (_, i) => codeBlocks[parseInt(i)]
  );

  // Clean up empty paragraphs
  text = text.replace(/<p class="[^"]*"><\/p>/g, "");
  text = text.replace(/<p class="[^"]*">(\s*<br\/>\s*)+<\/p>/g, "");

  return text;
}
