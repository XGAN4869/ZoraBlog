import { test, expect } from "@playwright/test";

test("theme selection survives reloads", async ({ page }) => {
  await page.route("**/api/session", (route) => route.fulfill({ json: { code: 0, data: { user: null } } }));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/blog");
  await page.getByRole("button", { name: "切换到亮色主题" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.getByRole("button", { name: "切换到暗色主题" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
});
