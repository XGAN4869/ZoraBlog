import { test, expect } from "@playwright/test";
import { highlightCode } from "../src/lib/syntax-highlighter";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/session", (route) => route.fulfill({ json: { code: 0, data: { user: null } } }));
});

test("highlighter preserves code and provides both themes for supported languages", async () => {
  for (const [language, source] of [
    ["go", 'package main\nfunc main() { println("hello") }'],
    ["ts", 'const value: string = "hello";\n'],
    ["js", 'const message = "hello";'],
    ["tsx", 'const App = () => <p>Hello</p>;'],
    ["vue", '<template><p>{{ message }}</p></template>\n<script setup>const message = "hello"</script>'],
    ["css", '.card { color: #3975f5; }'],
    ["html", '<p title="hello">World</p>'],
    ["json", '{ "enabled": true }'],
    ["bash", 'npm install shiki'],
    ["dotenv", 'PORT=8080\nNODE_ENV=production'],
    ["md", '# Heading\n\n**bold** and `code`'],
    ["mermaid", 'flowchart TD\n A[Hello] --> B[World]'],
    ["drawio", '<mxfile><diagram name="test" /></mxfile>'],
  ]) {
    const tokens = (await highlightCode(source, language))!;
    expect(tokens.map((line) => line.map((token) => token.content).join("")).join("\n")).toBe(source);
    expect(new Set(tokens.flat().map((token) => token.variants.dark.color)).size, language).toBeGreaterThan(1);
    expect(tokens.flat().every((token) => token.variants.light && token.variants.dark)).toBe(true);
  }
  expect(await highlightCode("plain text", "plainText")).toBeUndefined();
  expect(await highlightCode("plain text", "constructor")).toBeUndefined();
});

test("code tokens switch theme instantly and copying keeps text intact", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/articles/go-syntax");
  const code = page.locator('.code-block code[data-highlighted="true"]').first();
  await expect(code).toBeVisible();
  const colors = () => code.locator(".syntax-token").evaluateAll((tokens) => [...new Set(tokens.map((token) => getComputedStyle(token).color))]);
  const dark = await colors();
  expect(dark.length).toBeGreaterThan(1);
  await page.getByRole("button", { name: "切换到亮色主题" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  expect(await colors()).not.toEqual(dark);
  const text = await code.textContent();
  await page.locator(".code-block").first().getByRole("button", { name: "复制代码" }).click();
  expect((await page.evaluate(() => navigator.clipboard.readText())).replaceAll("\r\n", "\n")).toBe(text);
});

test("mobile directory starts at the viewport top and closes normally", async ({ page }) => {
  await page.setViewportSize({ width: 533, height: 488 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/articles/go-syntax");
  const trigger = page.getByRole("button", { name: "打开文章目录" });
  await trigger.click();
  const sheet = page.locator('[data-slot="sidebar"][data-mobile="true"]');
  await expect(sheet).toBeVisible();
  await expect(sheet).toHaveCSS("opacity", "1");
  const bounds = (await sheet.boundingBox())!;
  expect(bounds.y).toBe(0);
  expect(bounds.height).toBe(488);
  await page.screenshot({ path: "test-results/mobile-directory-flush-top.png" });
  await page.getByRole("button", { name: "关闭文章目录" }).click();
  await expect(sheet).not.toBeVisible();
  await expect(trigger).toBeFocused();
});
