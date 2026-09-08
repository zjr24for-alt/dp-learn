import type { Metadata } from "next";
import { allArticles, getArticleBySlug } from "@/content/index";
import type { Article } from "@/lib/types";
import { ArticleContent } from "./article-content";

export function generateStaticParams() {
  return allArticles.map((a) => ({ slug: a.slug }));
}

interface ArticleLink {
  slug: string;
  title: string;
}

/** 上一篇 / 下一篇：同类别内按内容文件顺序（服务端计算，客户端无需加载全部文章） */
function getNavArticles(slug: string): { prev: ArticleLink | null; next: ArticleLink | null } {
  const article = getArticleBySlug(slug);
  if (!article) return { prev: null, next: null };
  const sameCategory = allArticles.filter((a) => a.category === article.category);
  const idx = sameCategory.findIndex((a) => a.slug === slug);
  const toLink = (a: Article | undefined): ArticleLink | null =>
    a ? { slug: a.slug, title: a.title } : null;
  return {
    prev: toLink(idx > 0 ? sameCategory[idx - 1] : undefined),
    next: toLink(idx < sameCategory.length - 1 ? sameCategory[idx + 1] : undefined),
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) {
    return { title: "文章未找到" };
  }
  return {
    title: article.title,
    description: article.summary,
    alternates: { canonical: `/learn/${article.slug}` },
    openGraph: {
      type: "article",
      url: `/learn/${article.slug}`,
      title: article.title,
      description: article.summary,
      publishedTime: article.createdAt,
      modifiedTime: article.updatedAt,
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.summary,
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  const { prev, next } = getNavArticles(slug);

  // JSON-LD Article 结构化数据（随 HTML 输出，帮助搜索引擎理解页面）
  const jsonLd = article
    ? {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: article.title,
        description: article.summary,
        datePublished: article.createdAt,
        dateModified: article.updatedAt,
        keywords: (article.tags ?? []).join(", "),
        author: { "@type": "Person", name: "dp-learn" },
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            // 转义 < 防止标题/摘要中的尖括号提前闭合 script
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
      )}
      <ArticleContent
        slug={slug}
        builtinArticle={article ?? null}
        prevArticle={prev}
        nextArticle={next}
      />
    </>
  );
}
