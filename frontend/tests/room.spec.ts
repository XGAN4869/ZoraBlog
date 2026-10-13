import { test, expect, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/session", (route) => route.fulfill({ json: { code: 0, data: { user: null } } }));
});

async function openRoom(page: Page) {
  await page.goto("/#room");
  await expect.poll(() => page.locator(".home-page").evaluate((element) => element.scrollTop)).toBe(await page.evaluate(() => innerHeight));
  await expect(page.getByRole("link", { name: "进入博客" })).toBeVisible();
  await expect.poll(() => page.locator('[data-room-object="blog"] .studio-visual').evaluate((element) => getComputedStyle(element).opacity)).toBe("1");
}

test("home contains exactly two viewport sections and native wheel snaps both ways", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".home-page > section")).toHaveCount(2);
  await expect(page.locator(".site-footer")).toHaveCount(0);
  const height = await page.evaluate(() => innerHeight);
  expect(await page.locator(".home-page").evaluate((element) => element.scrollHeight)).toBe(height * 2);
  for (const section of await page.locator(".home-page > section").all()) expect((await section.boundingBox())!.height).toBe(height);
  await page.mouse.move(90, 300);
  await page.mouse.wheel(0, 650);
  await expect.poll(() => page.locator(".home-page").evaluate((element) => element.scrollTop)).toBe(height);
  await expect(page.locator("#room canvas.shape-grid")).toHaveCount(0);
  await page.mouse.wheel(0, 1000);
  await expect.poll(() => page.locator(".home-page").evaluate((element) => element.scrollTop)).toBe(height);
  await page.mouse.wheel(0, -650);
  await expect.poll(() => page.locator(".home-page").evaluate((element) => element.scrollTop)).toBe(0);
});

test("drag stays constrained, blocks wheel navigation, returns home and never opens the link", async ({ page }) => {
  await openRoom(page);
  const object = page.locator('[data-room-object="blog"]');
  const start = (await object.boundingBox())!;
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(start.x + start.width / 2 + 160, start.y + start.height / 2 + 160, { steps: 12 });
  const moved = (await object.boundingBox())!;
  expect(moved.x - start.x).toBeGreaterThan(8);
  expect(moved.x - start.x).toBeLessThanOrEqual(25);
  expect(moved.y - start.y).toBeLessThanOrEqual(25);
  await page.mouse.wheel(0, -650);
  expect(await page.locator(".home-page").evaluate((element) => element.scrollTop)).toBe(await page.evaluate(() => innerHeight));
  await page.mouse.move(start.x + start.width / 2 + 15, start.y + start.height / 2 + 15, { steps: 12 });
  await page.mouse.up();
  await expect(page).toHaveURL(/#room$/);
  await expect.poll(async () => Math.abs((await object.boundingBox())!.x - start.x)).toBeLessThan(1);
  await expect.poll(async () => Math.abs((await object.boundingBox())!.y - start.y)).toBeLessThan(1);
  await page.getByRole("link", { name: "进入博客" }).click();
  await expect(page).toHaveURL("/blog");
  await expect(page.getByRole("tab", { name: "TypeScript", exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "TypeScript", exact: true }).click();
  await expect(page.locator(".article-card")).toHaveCount(1);
  await page.locator(".article-card").click();
  await expect(page).toHaveURL(/typescript-discriminated-unions$/);
});

test("room supports keyboard entry, accessible information dialogs, and old article bookmarks", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openRoom(page);
  const projects = page.getByRole("button", { name: "查看项目", exact: true });
  await projects.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("link", { name: /Vite Ku Zora/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(projects).toBeFocused();
  await page.getByRole("button", { name: "认识 Zora", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("一名前端开发工程师");
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "进入博客" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/blog");
  await page.goto("/#articles");
  await expect(page).toHaveURL("/blog");
  await page.goto("/#notes");
  await expect(page.getByRole("tab", { name: "手记", exact: true })).toHaveAttribute("data-state", "active");
});

for (const [name, viewport] of [
  ["desktop", { width: 1440, height: 1000 }],
  ["laptop", { width: 1280, height: 720 }],
  ["short-laptop", { width: 1280, height: 600 }],
  ["tablet", { width: 820, height: 900 }],
  ["mobile", { width: 390, height: 844 }],
  ["small-mobile", { width: 320, height: 640 }],
] as const) {
  test(`room layout and return-to-hello: ${name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await openRoom(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator(".home-page").evaluate((element) => element.scrollHeight)).toBe(viewport.height * 2);
    const header = (await page.locator(".site-header").boundingBox())!;
    const rects = [];
    for (const object of await page.locator(".studio-surface").all()) {
      await expect(object).toBeInViewport({ ratio: 1 });
      const rect = (await object.boundingBox())!;
      expect(rect.y).toBeGreaterThanOrEqual(header.height);
      expect(rect.y + rect.height).toBeLessThan(viewport.height - 35);
      expect(await object.evaluate((element) => element.scrollHeight <= element.clientHeight + 1)).toBe(true);
      rects.push(rect);
    }
    for (let a = 0; a < rects.length; a++) for (let b = a + 1; b < rects.length; b++) {
      const width = Math.max(0, Math.min(rects[a].x + rects[a].width, rects[b].x + rects[b].width) - Math.max(rects[a].x, rects[b].x));
      const height = Math.max(0, Math.min(rects[a].y + rects[a].height, rects[b].y + rects[b].height) - Math.max(rects[a].y, rects[b].y));
      expect(width * height).toBe(0);
    }
    await page.screenshot({ path: `test-results/studio-${name}.png` });
    await page.getByRole("link", { name: "回到 Hi, Zora" }).click();
    await expect.poll(() => page.locator(".home-page").evaluate((element) => element.scrollTop)).toBe(0);
    await expect(page.getByRole("heading", { name: "Hi, Zora." })).toBeInViewport();
    expect(errors).toEqual([]);
  });
}

test("touch scrolling works over mobile cards without dragging them", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, baseURL: "http://127.0.0.1:5174" });
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openRoom(page);
  const card = (await page.getByRole("link", { name: "进入博客" }).boundingBox())!;
  const session = await context.newCDPSession(page);
  const x = card.x + card.width / 2;
  const y = card.y + card.height / 2;
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  for (let step = 1; step <= 8; step++) {
    await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y + step * 60 }] });
    await page.waitForTimeout(25);
  }
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect.poll(() => page.locator(".home-page").evaluate((element) => element.scrollTop)).toBeLessThan(await page.evaluate(() => innerHeight));
  await expect(page.locator('[data-room-object="blog"]')).toHaveCSS("transform", "none");
  await context.close();
});

test("touch tapping a mobile card opens the blog", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, baseURL: "http://127.0.0.1:5174" });
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openRoom(page);
  await page.getByRole("link", { name: "进入博客" }).tap();
  await expect(page).toHaveURL("http://127.0.0.1:5174/blog");
  await context.close();
});
