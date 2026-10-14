import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/session", (route) => route.fulfill({ json: { code: 0, data: { user: null } } }));
});

test("home has one screen and its article entry still works", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".home-page > section")).toHaveCount(1);
  await expect(page.locator("#room")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Hi, Zora." })).toBeVisible();
  await page.getByRole("link", { name: "探索文章" }).click();
  await expect(page).toHaveURL(/\/articles\/go-syntax$/);
  await page.getByRole("link", { name: "返回首页" }).click();
  await expect(page).toHaveURL("/");
});

test("old room bookmarks return to the home screen", async ({ page }) => {
  await page.goto("/#room");
  await expect(page).toHaveURL("/");
  await expect(page.locator(".home-page > section")).toHaveCount(1);
});
