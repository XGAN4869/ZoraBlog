import { test, expect } from "@playwright/test";
import { highlightCode } from "../src/lib/syntax-highlighter";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/session", (route) => route.fulfill({ json: { code: 0, data: { user: null } } }));
});

test("highlighter preserves whitespace and falls back for unsupported languages", async () => {
  for (const [language, source] of [
    ["go", '\npackage main\n\nfunc main() {\n\tprintln("hello")\n}\n'],
    ["TS", 'const value: string = "hello";\n'],
  ]) {
    const tokens = (await highlightCode(source, language))!;
    expect(tokens.map((line) => line.map((token) => token.content).join("")).join("\n")).toBe(source);
  }
  expect(await highlightCode("plain text", "plainText")).toBeUndefined();
  expect(await highlightCode("plain text", "constructor")).toBeUndefined();
});

test("copying a highlighted code block keeps its original text", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/articles/go-syntax");
  const code = page.locator('.code-block code[data-highlighted="true"]').first();
  await expect(code).toBeVisible();
  const text = await code.textContent();
  await page.locator(".code-block").first().getByRole("button", { name: "复制代码" }).click();
  expect((await page.evaluate(() => navigator.clipboard.readText())).replaceAll("\r\n", "\n")).toBe(text);
});
