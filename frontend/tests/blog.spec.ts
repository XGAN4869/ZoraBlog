import { test, expect } from "@playwright/test";

test("home renders a live grid and filters articles", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Hi, I'm Zora." }),
  ).toBeVisible();
  const canvas = page.locator("canvas").first();
  await expect(canvas).toBeVisible();
  await expect
    .poll(() =>
      canvas
        .evaluate((element: HTMLCanvasElement) => {
          const pixels = element
            .getContext("2d")!
            .getImageData(0, 0, element.width, element.height).data;
          return pixels.some((value, index) => index % 4 === 3 && value > 0);
        })
        .catch(() => false),
    )
    .toBe(true);
  await page.getByRole("tab", { name: "TypeScript", exact: true }).click();
  await expect(page.locator(".article-card")).toHaveCount(1);
  await page.locator(".article-card").click();
  await expect(page).toHaveURL(/\/articles\/typescript-discriminated-unions/);
  await expect(
    page.getByRole("heading", { name: "用状态标签关联数据" }),
  ).toBeVisible();
});

test("search opens with keyboard and finds an article", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Control+k");
  await page.getByPlaceholder("搜索文章、技术或关键词…").fill("computed");
  await page.getByRole("dialog").getByRole("link").first().click();
  await expect(page).toHaveURL(/vue-composable-state/);
});

test("theme persists and mobile layout stays in viewport", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "切换到亮色主题" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "打开导航菜单" }).click();
  await page.getByRole("menuitem", { name: "登录" }).click();
  await expect(page).toHaveURL("/login");
});

test("preview login validates and never persists credentials", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "预览登录" }).click();
  await expect(page.getByText("请输入有效的邮箱地址")).toBeVisible();
  await page.getByLabel("邮箱地址").fill("zora@example.com");
  await page.getByLabel("密码", { exact: true }).fill("demo-password");
  await page.getByRole("button", { name: "显示密码" }).click();
  await expect(page.getByLabel("密码", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await page.getByRole("button", { name: "预览登录" }).click();
  await expect(page.getByText("前端预览成功")).toBeVisible();
  expect(
    await page.evaluate(() =>
      JSON.stringify({ ...localStorage, ...sessionStorage }),
    ),
  ).not.toContain("demo-password");
});

test("grid animates, responds to pointer, and respects reduced motion", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const canvas = page.locator("canvas").first();
  const snapshot = () =>
    canvas.evaluate((element: HTMLCanvasElement) => {
      const pixels = element
        .getContext("2d")!
        .getImageData(0, 0, 170, 170).data;
      let hash = 0;
      for (let index = 0; index < pixels.length; index++)
        hash = (hash * 31 + pixels[index]) | 0;
      return hash;
    });
  const initial = await snapshot();
  await expect.poll(snapshot).not.toBe(initial);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.mouse.move(100, 180);
  await page.waitForTimeout(100);
  const still = await snapshot();
  await page.waitForTimeout(250);
  expect(await snapshot()).toBe(still);
});
