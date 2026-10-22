import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/session", (route) => route.fulfill({ json: { code: 0, data: { user: null } } }));
  // 这里只验证操作结果，不采样动画过程。
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("search opens with keyboard and navigates to a matching article", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Control+k");
  await page.getByPlaceholder("搜索文章、技术或关键词…").fill("computed");
  await page.getByRole("dialog").getByRole("link", { name: /Vue 组合式函数：复用逻辑/ }).click();
  await expect(page).toHaveURL(/vue-composable-state/);
});

test("desktop navigation, outline and browser history open the correct articles", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "主导航" }).getByRole("button", { name: "前端", exact: true }).hover();
  await page.locator('[data-slot="navigation-menu-content"]').getByRole("link", { name: "好的 React 组件，从划清边界开始" }).click();
  await expect(page).toHaveURL(/react-component-boundaries/);

  const outline = page.getByRole("navigation", { name: "文章大纲" });
  const section = outline.getByRole("link", { name: "状态放在需要它的共同父级" });
  await section.click();
  await expect(page).toHaveURL(/#section-1$/);
  await expect(section).toHaveAttribute("aria-current", "location");

  const directory = page.getByRole("navigation", { name: "文章分类目录" });
  await directory.getByRole("button", { name: "Vue", exact: true }).click();
  await directory.getByRole("link", { name: "Vue 组合式函数：复用逻辑，也保留边界", exact: true }).click();
  await expect(page.locator(".reading-content h1")).toHaveText("Vue 组合式函数：复用逻辑，也保留边界");
  await page.goBack();
  await expect(page.locator(".reading-content h1")).toHaveText("好的 React 组件，从划清边界开始");
  await page.goForward();
  await expect(page).toHaveURL(/vue-composable-state/);
});

test("mobile directory and outline close after selection and Escape restores focus", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/articles/react-component-boundaries");
  const trigger = page.getByRole("button", { name: "打开文章目录" });
  const directory = page.getByRole("navigation", { name: "文章分类目录" });
  await trigger.click();
  await expect(directory).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(directory).not.toBeVisible();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await directory.getByRole("button", { name: "TypeScript", exact: true }).click();
  await directory.getByRole("link", { name: "用 TypeScript，把“不可能”写进类型" }).click();
  await expect(page).toHaveURL(/typescript-discriminated-unions/);
  await expect(directory).not.toBeVisible();
  await page.getByRole("button", { name: "打开文章大纲" }).click();
  await page.getByRole("dialog").getByRole("link", { name: "用状态标签关联数据" }).click();
  await expect(page).toHaveURL(/#section-1$/);
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("directory collapse and category expansion remain usable", async ({ page }) => {
  await page.goto("/articles/react-component-boundaries");
  await page.getByRole("button", { name: "折叠文章目录", exact: true }).click();
  const expand = page.getByRole("button", { name: "展开文章目录", exact: true });
  await expect(expand).toBeVisible();
  await expand.click();
  const directory = page.getByRole("navigation", { name: "文章分类目录" });
  await expect(directory.locator('a[aria-current="page"]')).toBeVisible();
  const category = directory.getByRole("button", { name: "Vue", exact: true });
  const article = directory.getByRole("link", { name: "Vue 组合式函数：复用逻辑，也保留边界", exact: true });
  await category.click();
  await expect(article).toBeVisible();
  await category.click();
  await expect(article).not.toBeVisible();
});
