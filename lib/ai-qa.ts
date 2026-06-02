/**
 * 客户端直接调用 DeepSeek API 生成整合回答。
 * API Key 存储在 localStorage，由用户在 /qa 页面配置。
 */

const DEEPSEEK_API = "https://api.deepseek.com/v1/chat/completions";

export function getApiKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("dp-learn-deepseek-key");
}

export function setApiKey(key: string): void {
  localStorage.setItem("dp-learn-deepseek-key", key);
}

export function clearApiKey(): void {
  localStorage.removeItem("dp-learn-deepseek-key");
}

export function hasApiKey(): boolean {
  return !!getApiKey();
}

export interface AIResponse {
  answer: string;
  error?: string;
}

export async function askAI(question: string, context: string): Promise<AIResponse> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { answer: "", error: "未配置 API Key" };
  }

  const systemPrompt = `你是 DP（Deep Potential）学习助教，专门帮助计算材料科学研究生理解 DP-GEN、DeePMD、VASP、LAMMPS 相关概念和操作。

请基于以下提供的知识库内容回答问题。如果知识库中有相关信息，请整合并给出清晰的回答，并注明引用来源编号。
如果知识库中没有足够信息，请基于你的训练知识诚实回答，但要说明"以下回答超出知识库范围，基于通用知识"。

回答要求：
- 使用中文
- 结构清晰，关键命令/参数用代码块
- 涉及官方文档的地方给出链接
- 最后列出参考来源`;

  try {
    const res = await fetch(DEEPSEEK_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `知识库内容：\n\n${context}\n\n---\n\n用户问题：${question}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 2048,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { answer: "", error: `API 调用失败 (${res.status}): ${errText.slice(0, 200)}` };
    }

    const data = await res.json();
    const answer = data.choices?.[0]?.message?.content || "";
    return { answer };
  } catch (e: any) {
    return { answer: "", error: `网络错误: ${e.message}` };
  }
}
