import { articles } from "@/data/articles";

export const articleModules = [
  {
    id: "frontend",
    label: "前端",
    categories: ["React", "Vue", "TypeScript", "JavaScript", "CSS", "浏览器"],
  },
  { id: "engineering", label: "工程", categories: ["工程实践"] },
  { id: "backend", label: "后端", categories: ["Go", "Node.js"] },
  { id: "journal", label: "手记", categories: ["手记"] },
];

export function categoryArticles(category: string) {
  return articles.filter((article) => article.category === category);
}

// Imported notes lead the reading order. Pagination follows this same directory.
const categoryPosition = (category: string) => {
  const index = articles.findIndex((article) => article.category === category);
  return index < 0 ? Infinity : index;
};
export const readingModules = articleModules.map((module) => ({
  ...module,
  categories: [...module.categories].sort((a, b) => categoryPosition(a) - categoryPosition(b)),
})).sort((a, b) => categoryPosition(a.categories[0]) - categoryPosition(b.categories[0]));
export const readingArticles = readingModules.flatMap((module) => module.categories.flatMap(categoryArticles));
