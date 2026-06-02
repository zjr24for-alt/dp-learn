import { allArticles } from "@/content/index";
import { ArticleContent } from "./article-content";

export function generateStaticParams() {
  return allArticles.map((a) => ({ slug: a.slug }));
}

export default function ArticlePage({ params }: { params: { slug: string } }) {
  return <ArticleContent slug={params.slug} />;
}
