import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Markdown from "react-markdown";
import { markdownDocument, remarkArticleHeadings } from "../src/lib/markdown";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/session", (route) => route.fulfill({ json: { code: 0, data: { user: null } } }));
});

test("article headings build an outline without treating code as headings", () => {
  const markdown = '# Note\n\n## A **bold** heading\n\n### Repeat\n\n### Repeat\n\n```go\n# not a heading\n```';
  const document = markdownDocument(markdown, "Note");
  expect(document.outline).toEqual([
    { heading: "A bold heading", level: 2 },
    { heading: "Repeat", level: 3 },
    { heading: "Repeat", level: 3 },
  ]);
  const html = renderToStaticMarkup(createElement(Markdown, {
    remarkPlugins: [[remarkArticleHeadings, { title: "Note" }]],
  }, markdown));
  expect(html).toContain('id="section-0"');
  expect(html).toContain('id="section-2"');
  expect(html).not.toContain("<h1");
});

test("Go notes appear in the blog, render tables, navigate outline, and download the original", async ({ page }) => {
  await page.goto("/blog");
  await expect(page).toHaveURL("/articles/go-syntax");
  await page.getByRole("navigation", { name: "文章分类目录" }).getByRole("link", { name: "Gin 路由与传参", exact: true }).click();
  await expect(page).toHaveURL(/\/articles\/go-routing/);
  await expect(page.locator(".markdown-prose table").first()).toBeVisible();
  const outline = page.getByRole("navigation", { name: "文章大纲" });
  await outline.getByRole("link", { name: "传参方式速查表（gin 为例）" }).click();
  await expect(page).toHaveURL(/#section-1$/);
  await expect(page.locator("#section-1")).toBeInViewport();
  const downloading = page.waitForEvent("download");
  await page.getByRole("link", { name: "下载 Markdown", exact: true }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe("go-routing.md");
  expect(await readFile((await download.path())!)).toEqual(await readFile(new URL("../src/content/articles/backend/" + encodeURIComponent("路由.md"), import.meta.url)));
});

test("search finds articles by Markdown body content", async ({ page }) => {
  await page.goto("/articles/ui-components-theme");
  await expect(page.getByRole("heading", { name: "UI 组件封装与统一主题", level: 1 })).toHaveCount(1);
  await expect(page.locator(".markdown-prose h1")).toHaveCount(0);
  await page.keyboard.press("Control+k");
  await page.getByPlaceholder("搜索文章、技术或关键词…").fill("ShouldBindUri");
  await page.getByRole("dialog").getByRole("link", { name: /Gin 路由与传参/ }).click();
  await expect(page).toHaveURL(/\/articles\/go-routing/);
});

test("mobile Markdown tables remain readable and outline links work", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/articles/go-routing");
  const table = page.locator(".markdown-prose table").first();
  await table.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await table.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  await page.getByRole("button", { name: "打开文章大纲" }).click();
  await page.getByRole("dialog").getByRole("link", { name: "router.GET/POST 内部逻辑" }).click();
  await expect(page.locator("#section-6")).toBeInViewport();
});

test("code-only notes have no empty outline and Draw.io source stays intact", async ({ page }) => {
  await page.goto("/articles/go-memory-users");
  await expect(page.locator(".markdown-prose .code-block").first()).toBeVisible();
  await expect(page.getByRole("navigation", { name: "文章大纲" })).toHaveCount(0);
  await page.goto("/articles/http-request");
  await page.getByText("Draw.io 图源", { exact: true }).click();
  await expect(page.locator(".diagram-source code")).toContainText("<mxfile>");
});
