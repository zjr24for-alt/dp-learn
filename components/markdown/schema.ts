import { defaultSchema } from "hast-util-sanitize";
import type { Schema } from "hast-util-sanitize";

/**
 * 消毒 schema（rehype-sanitize）。
 *
 * 在默认 GitHub 风格 schema 基础上扩展：
 * - `*` 允许 className / aria-hidden / role：KaTeX 输出的类名（katex、katex-html、mord…）
 *   依赖 className，否则公式会失去样式；aria 属性用于可访问性。
 * - span / div 允许 style：KaTeX 用行内样式控制上下标、间距、定位。
 * - `a` 允许 target / rel：渲染器统一为外链加 target="_blank"。
 *
 * XSS 双保险：react-markdown 默认不渲染原始 HTML、默认 URL 转换会拦截
 * javascript: 等危险协议；rehype-sanitize 是第二道防线（用户笔记、AI 回答都过这里）。
 */
const baseAttributes = defaultSchema.attributes ?? {};

export const markdownSchema: Schema = {
  ...defaultSchema,
  attributes: {
    ...baseAttributes,
    "*": [...(baseAttributes["*"] ?? []), "className", "aria-hidden", "role"],
    span: [...(baseAttributes.span ?? []), "style"],
    div: [...(baseAttributes.div ?? []), "style"],
    a: [...(baseAttributes.a ?? []), "target", "rel"],
  },
};
