import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const origin = process.env.PREVIEW_URL || "http://127.0.0.1:5174";
await mkdir("test-results/visual", { recursive: true });
const browser = await chromium.launch();
const failures = [];
const roadmap = JSON.parse(await readFile(new URL("../src/content/roadmap.json", import.meta.url), "utf8"));
const imageNote = roadmap.notes.find((note) => note.file.endsWith("TypeScript/小满Zs/Mixins.md"));

try {
  for (const [name, viewport, theme] of [
    ["desktop-dark", { width: 1920, height: 1080 }, "dark"],
    ["desktop-light", { width: 1440, height: 1000 }, "light"],
    ["compact-dark", { width: 769, height: 472 }, "dark"],
    ["mobile-dark", { width: 390, height: 844 }, "dark"],
    ["mobile-light", { width: 390, height: 844 }, "light"],
  ]) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1, reducedMotion: "reduce" });
    page.on("pageerror", (error) => failures.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") failures.push(message.text());
    });
    await page.addInitScript(
      (value) => localStorage.setItem("zora-theme", value),
      theme,
    );
    await page.route("**/api/session", (route) => route.fulfill({ json: { code: 0, data: { user: null } } }));
    for (const [routeName, route] of [
      ["home", "/"],
      ["blog", "/blog"],
      ["article", "/articles/react-component-boundaries"],
      ["markdown", "/articles/go-routing"],
      ["obsidian", "/articles/ui-components-theme"],
      ["roadmap", `/articles/${imageNote.slug}`],
    ]) {
      await page.goto(`${origin}${route}`);
      await page.waitForLoadState("networkidle");
      await page.locator("main").waitFor();
      if (routeName !== "home") {
        await page.locator(".article-pagination").waitFor();
      }
      if (routeName === "roadmap") {
        await page.locator(".markdown-prose img").scrollIntoViewIfNeeded();
        await page.waitForFunction(() => [...document.querySelectorAll(".markdown-prose img")].every((image) => image.complete && image.naturalWidth > 0));
      }
      // Reveal viewport-triggered article animations before full-page capture.
      for (
        let y = 0;
        y < (await page.evaluate(() => document.documentElement.scrollHeight));
        y += viewport.height * 0.7
      ) {
        await page.evaluate((top) => scrollTo(0, top), y);
        await page.waitForTimeout(130);
      }
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForTimeout(500);
      await page.screenshot({
        path: `test-results/visual/${name}-${routeName}.png`,
        fullPage: true,
      });
    }
    await page.close();
    console.log(`${name}: home, blog, article and Markdown notes verified`);
  }
  assert.deepEqual(failures, [], "Browser console errors");
} finally {
  await browser.close();
}
