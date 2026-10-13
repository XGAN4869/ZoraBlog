import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Markdown from "react-markdown";
import { remarkObsidian } from "../src/lib/obsidian";

const manifest = JSON.parse(readFileSync(new URL("../src/content/roadmap.json", import.meta.url), "utf8")) as {
  notes: { file: string; slug: string; title: string }[]; empty: string[]; assets: { source: string; url: string }[];
};
const note = (path: string) => manifest.notes.find((item) => item.file.endsWith(path))!;

test.beforeEach(async ({ page }) => {
  await page.route("**/api/session", (route) => route.fulfill({ json: { code: 0, data: { user: null } } }));
});

test("blog redirects to first document without an intermediate listing or history entry", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "探索文章", exact: true }).click();
  await expect(page).toHaveURL("/articles/go-syntax");
  await expect(page.locator(".article-card")).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL("/");
  await page.goto("/blog?category=手记");
  await expect(page).toHaveURL("/articles/learning-by-writing");
  await page.goto("/blog?category=missing");
  await expect(page).toHaveURL("/articles/go-syntax");
});

test("document footer follows directory order and handles both ends", async ({ page }) => {
  await page.goto("/blog");
  const pagination = page.getByRole("navigation", { name: "文章翻页" });
  await expect(pagination.getByRole("link", { name: /^Previous:/ })).toHaveCount(0);
  await pagination.getByRole("link", { name: "Next: HTTP 请求与 Gin 参数绑定" }).click();
  await expect(page).toHaveURL("/articles/http-request");
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await pagination.getByRole("link", { name: "Previous: Go 语法笔记" }).click();
  await expect(page).toHaveURL("/articles/go-syntax");
  await expect(page.getByText("继续探索", { exact: true })).toHaveCount(0);
  await page.goto("/articles/learning-by-writing");
  await expect(pagination.getByRole("link", { name: /^Next:/ })).toHaveCount(0);
  await expect(pagination.getByRole("link", { name: /^Previous:/ })).toHaveCount(1);
});

test("Obsidian links and embeds transform without rewriting inline code or arrays", () => {
  const markdown = '[[Note|Read this]] ![[photo.png]] `[[Note]]`\n\n```js\nconst arr = [[1, 2], [3]]\n```\n\n[[Missing]]';
  const html = renderToStaticMarkup(createElement(Markdown, { remarkPlugins: [[remarkObsidian, {
    resolve: (target: string) => target === "Note" ? "/articles/note" : target === "photo.png" ? "/note-assets/photo.png" : undefined,
  }]] }, markdown));
  expect(html).toContain('href="/articles/note"');
  expect(html).toContain('src="/note-assets/photo.png"');
  expect(html).toContain("<code>[[Note]]</code>");
  expect(html).toContain("const arr = [[1, 2], [3]]");
  expect(html).toContain("[[Missing]]");
});

test("roadmap imports publish content, keep empty notes as source, and resolve Markdown links", async ({ page }) => {
  expect(manifest.notes).toHaveLength(75);
  expect(manifest.empty).toHaveLength(2);
  expect(manifest.assets).toHaveLength(16);
  const index = note("浏览器/gpt前端场景/README.md");
  const overview = note("浏览器/gpt前端场景/00-总览与学习路线.md");
  await page.goto(`/articles/${index.slug}`);
  await page.locator(".markdown-prose").getByRole("link", { name: "总览与学习路线", exact: true }).click();
  await expect(page).toHaveURL(`/articles/${overview.slug}`);
  await expect(page.getByRole("heading", { name: overview.title, level: 1 })).toBeVisible();
});

test("roadmap wiki heading links work and local embedded images load", async ({ page }) => {
  const arrays = note("知识点/base/数组方法常用.md");
  await page.goto(`/articles/${arrays.slug}`);
  const link = page.locator(".markdown-prose").getByRole("link", { name: "push / pop", exact: true });
  await link.click();
  await expect(page).toHaveURL(/#section-\d+$/);
  const hash = await page.evaluate(() => location.hash);
  await expect(page.locator(hash)).toBeInViewport();
  const mixins = note("TypeScript/小满Zs/Mixins.md");
  await page.goto(`/articles/${mixins.slug}`);
  const image = page.locator(".markdown-prose img");
  await image.scrollIntoViewIfNeeded();
  await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(image).toHaveAttribute("src", /^\/note-assets\/roadmap\//);
});

test("mobile document footer stays within viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/articles/http-request");
  const footer = page.getByRole("navigation", { name: "文章翻页" });
  await footer.scrollIntoViewIfNeeded();
  for (const link of await footer.getByRole("link").all()) await expect(link).toBeInViewport({ ratio: 1 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/document-pagination-mobile.png" });
});
