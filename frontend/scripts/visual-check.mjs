import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";

const origin = process.env.PREVIEW_URL || "http://127.0.0.1:5174";
await mkdir("test-results/visual", { recursive: true });
const browser = await chromium.launch();
const failures = [];

try {
  for (const [name, viewport, theme] of [
    ["desktop-dark", { width: 1920, height: 1080 }, "dark"],
    ["desktop-light", { width: 1440, height: 1000 }, "light"],
    ["mobile-dark", { width: 390, height: 844 }, "dark"],
    ["mobile-light", { width: 390, height: 844 }, "light"],
  ]) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
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
      ["login", "/login"],
      ["article", "/articles/react-component-boundaries"],
    ]) {
      await page.goto(`${origin}${route}`);
      await page.waitForLoadState("networkidle");
      await page.locator("main").waitFor();
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${name}/${routeName}: horizontal overflow`,
      );
      if (routeName === "home") {
        await page.locator('.hero-terminal-greeting[data-typing-complete="true"]').waitFor();
        await page.locator(".hero-terminal-output").evaluate(async (element) => {
          await Promise.all(element.getAnimations().map((animation) => animation.finished));
        });
        const hero = await page.locator(".hero").boundingBox();
        const heading = await page.locator(".hero h1").boundingBox();
        assert(
          hero &&
            heading &&
            heading.x >= 0 &&
            heading.x + heading.width <= viewport.width,
          `${name}: heading framing`,
        );
        const screens = await page.locator(".home-page > section").count();
        assert(
          screens === 2 && Math.abs(hero.height - viewport.height) < 1,
          `${name}: home must have exactly two full-height screens`,
        );
        await page.screenshot({ path: `test-results/visual/${name}-hero.png` });
        await page.locator(".home-page").evaluate((element) => element.scrollTo({ top: innerHeight, behavior: "instant" }));
        await page.waitForTimeout(1000);
        const room = await page.locator("#room").boundingBox();
        assert(Math.abs(room.y) < 1 && Math.abs(room.height - viewport.height) < 1, `${name}: room framing`);
        await page.screenshot({ path: `test-results/visual/${name}-room.png` });
        await page.locator(".home-page").evaluate((element) => element.scrollTo({ top: 0, behavior: "instant" }));
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
    console.log(`${name}: home, room, blog, login and article verified`);
  }
  assert.deepEqual(failures, [], "Browser console errors");
} finally {
  await browser.close();
}
