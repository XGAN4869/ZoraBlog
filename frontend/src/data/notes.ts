import type { Article } from "./articles";
import { markdownDocument } from "../lib/markdown";
import roadmap from "../content/roadmap.json";

const content = import.meta.glob<string>("../content/articles/**/*.md", { eager: true, query: "?raw", import: "default" });
const downloads = import.meta.glob<string>("../content/articles/**/*.md", { eager: true, query: "?url", import: "default" });

type NoteDefinition = { file: string; slug: string; title: string; summary: string; category: string; source?: string; date?: string };
const definitions: NoteDefinition[] = [
  { file: "backend/go语法.md", slug: "go-syntax", title: "Go 语法笔记", summary: "记录变量、结构体、指针、map、切片与接口等 Go 语法。", category: "Go" },
  { file: "backend/HTTP请求.md", slug: "http-request", title: "HTTP 请求与 Gin 参数绑定", summary: "请求结构体、binding 标签与 Gin 的参数绑定流程。", category: "Go" },
  { file: "backend/interface接口.md", slug: "go-interface", title: "Go interface 接口", summary: "用代码理解接口赋值、动态类型与动态值。", category: "Go" },
  { file: "backend/knowledge.md", slug: "go-backend-basics", title: "Go 后端知识笔记", summary: "后端分层、并发安全、环境变量、编译链接与序列化。", category: "Go" },
  { file: "backend/vscode的go配置.md", slug: "go-vscode-setup", title: "VS Code 的 Go 开发配置", summary: "Go 开发环境的 VS Code 配置参考。", category: "Go" },
  { file: "backend/登录认证.md", slug: "go-authentication", title: "Go 登录认证与 JWT", summary: "登录认证方式与 JWT 的 JSON、编码和签名过程。", category: "Go" },
  { file: "backend/路由.md", slug: "go-routing", title: "Gin 路由与传参", summary: "URL 结构、传参方式，以及 Gin、Echo、Chi 和标准库的路由对照。", category: "Go" },
  { file: "backend/中间件.md", slug: "go-middleware", title: "Go 中间件", summary: "中间件执行时机与请求处理链的设计记录。", category: "Go" },
  { file: "backend/之前main用哈希表实现.md", slug: "go-memory-users", title: "Go 内存用户存储的早期实现", summary: "保留早期使用 map、读写锁和 Gin 处理用户请求的 main.go 示例。", category: "Go" },
  { file: "obsidian/ui组件封装与统一主题.md", slug: "ui-components-theme", title: "UI 组件封装与统一主题", summary: "从博客源码理解 UI 组件、主题变量与 ThemeProvider 的职责。", category: "工程实践" },
  ...roadmap.notes,
];

export const markdownArticles: Article[] = definitions.map(({ file, ...definition }) => {
  const path = `../content/articles/${file}`;
  const markdown = content[path];
  if (!markdown?.trim()) throw new Error(`Markdown article is missing or empty: ${file}`);
  const document = markdownDocument(markdown, definition.title);
  return {
    ...definition,
    date: definition.date ?? "2026.10.13", // Import/publication date, not an inferred creation date.
    readTime: document.readTime,
    cover: "notes",
    markdown,
    markdownUrl: downloads[path],
    source: definition.source ?? file.replace(/^backend\//, "backend/notes/").replace(/^obsidian\//, "ObsidianNote/"),
    sections: document.outline.map((heading) => ({ ...heading, paragraphs: [] })),
  };
});

// Resolve relative Markdown links without changing the original note text.
export function markdownArticleHref(href: string, source?: string, wiki = false): string | undefined {
  if (!source || /^[a-z][a-z\d+.-]*:/i.test(href) || href.startsWith("//")) return;
  const [rawPath, hash] = href.split("#", 2);
  if (!wiki && rawPath && !rawPath.toLowerCase().endsWith(".md")) return;
  let path: string;
  try { path = decodeURIComponent(rawPath).replaceAll("\\", "/"); }
  catch { return; }
  path = path.replace(/^路线\//, "roadmap/");
  const segments: string[] = [];
  const relative = path.startsWith("roadmap/") ? path : `${source.slice(0, source.lastIndexOf("/"))}/${path}`;
  for (const segment of relative.split("/")) {
    if (segment === "..") segments.pop();
    else if (segment && segment !== ".") segments.push(segment);
  }
  const exact = !path ? markdownArticles.find((article) => article.source === source)
    : markdownArticles.find((article) => article.source === segments.join("/") || article.source?.replace(/\.md$/i, "") === segments.join("/"));
  const basename = path.split("/").at(-1)?.replace(/\.md$/i, "");
  const byName = markdownArticles.filter((article) => article.source?.split("/").at(-1)?.replace(/\.md$/i, "") === basename || article.title === basename);
  const target = exact ?? (byName.length === 1 ? byName[0] : undefined);
  if (!target) return;
  let anchor = "";
  if (hash) {
    let heading: string;
    try { heading = decodeURIComponent(hash); } catch { return; }
    const index = target.sections.findIndex((section) => section.heading === heading || section.heading.toLowerCase().replace(/\s+/g, "-") === heading);
    anchor = index >= 0 ? `#section-${index}` : `#${hash}`;
  }
  return `/articles/${target.slug}${anchor}`;
}

export function markdownAssetHref(href: string, source?: string): string | undefined {
  if (!source || /^[a-z][a-z\d+.-]*:/i.test(href) || href.startsWith("//")) return;
  if (roadmap.assets.some((asset) => asset.url === href)) return href;
  let path: string;
  try { path = decodeURIComponent(href).replaceAll("\\", "/"); } catch { return; }
  const segments: string[] = [];
  for (const segment of `${source.slice(0, source.lastIndexOf("/"))}/${path}`.split("/")) {
    if (segment === "..") segments.pop();
    else if (segment && segment !== ".") segments.push(segment);
  }
  const exact = roadmap.assets.find((asset) => asset.source === segments.join("/"));
  const candidates = roadmap.assets.filter((asset) => asset.source.split("/").at(-1) === path.split("/").at(-1));
  return exact?.url ?? (candidates.length === 1 ? candidates[0].url : undefined);
}
