import { Navigate, useSearchParams } from "react-router-dom";
import { readingArticles } from "@/data/navigation";
import { NotFound } from "@/pages/NotFound";

export function Blog() {
  const [searchParams] = useSearchParams();
  const category = searchParams.get("category");
  const first = readingArticles.find((article) => article.category === category) ?? readingArticles[0];
  return first ? <Navigate replace to={`/articles/${first.slug}`} /> : <NotFound />;
}
