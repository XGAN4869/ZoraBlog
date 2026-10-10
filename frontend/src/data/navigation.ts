import { articles } from "@/data/articles";

export const articleModules = [
  {
    id: "frontend",
    label: "前端",
    categories: ["React", "Vue", "TypeScript", "CSS"],
  },
  { id: "engineering", label: "工程", categories: ["工程实践"] },
  { id: "journal", label: "手记", categories: ["手记"] },
];

export function categoryArticles(category: string) {
  return articles.filter((article) => article.category === category);
}
