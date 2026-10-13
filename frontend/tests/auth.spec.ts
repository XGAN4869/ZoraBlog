import { test, expect } from "@playwright/test";

const visitor = { id: 7, username: "visitor", email: "" };

test("the header starts GitHub login directly and restores the session", async ({ page }) => {
  let signedIn = false;
  await page.route("**/api/session", (route) => route.fulfill({ json: { code: 0, data: { user: signedIn ? visitor : null } } }));
  await page.route("**/api/auth/github?**", async (route) => {
    const request = new URL(route.request().url());
    expect(request.searchParams.get("remember")).toBeNull();
    expect(request.searchParams.get("redirect")).toBe("/articles/go-syntax");
    signedIn = true;
    await route.fulfill({ status: 303, headers: { location: "/articles/go-syntax" } });
  });
  await page.route("**/api/logout", async (route) => { signedIn = false; await route.fulfill({ json: { code: 0 } }); });
  await page.goto("/articles/go-syntax");
  await expect(page.locator(".login-page")).toHaveCount(0);
  await page.getByRole("link", { name: "使用 GitHub 登录" }).click();
  await expect(page.getByRole("button", { name: "账户：visitor" })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "账户：visitor" }).click();
  await page.getByRole("menuitem", { name: "退出登录" }).click();
  await expect(page.getByRole("button", { name: "账户：visitor" })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("link", { name: "使用 GitHub 登录" })).toBeVisible();
  const storage = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
  expect(storage).not.toContain("visitor");
  expect(storage).not.toContain("access_token");
  expect(storage).not.toContain("zora_session");
});

test("OAuth errors are shown on the current page and legacy login URLs return home", async ({ page }) => {
  await page.route("**/api/session", (route) => route.fulfill({ json: { code: 0, data: { user: null } } }));
  await page.route("**/api/auth/github?**", async (route) => {
    const request = new URL(route.request().url());
    expect(request.searchParams.get("redirect")).toBe("/articles/go-syntax?view=code#example");
    await route.fulfill({ status: 303, headers: { location: "/articles/go-syntax?auth_error=oauth_unavailable&view=code#example" } });
  });
  await page.goto("/articles/go-syntax?auth_error=invalid_state&view=code#example");
  await expect(page.getByText("这次登录已过期，请重新使用 GitHub 登录。", { exact: true })).toBeVisible();
  await expect(page).toHaveURL("/articles/go-syntax?view=code#example");
  await page.getByRole("link", { name: "使用 GitHub 登录" }).click();
  await expect(page.getByText("GitHub 登录暂未开放，请稍后再试。", { exact: true })).toBeVisible();
  await expect(page).toHaveURL("/articles/go-syntax?view=code#example");
  await page.goto("/?auth_error=oauth_denied");
  await expect(page.getByText("你取消了 GitHub 授权，可以重新尝试。", { exact: true })).toBeVisible();
  for (const route of ["/login", "/register"]) {
    await page.goto(route);
    await expect(page).toHaveURL("/");
    await expect(page.locator(".login-page")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Hi, Zora." })).toBeVisible();
  }
});

test("desktop and mobile GitHub login entries fit their layouts", async ({ page }, testInfo) => {
  await page.route("**/api/session", (route) => route.fulfill({ json: { code: 0, data: { user: null } } }));
  await page.route("**/api/auth/github?**", (route) => route.fulfill({
    status: 303, headers: { location: "/articles/go-syntax?auth_error=oauth_denied" },
  }));
  for (const [name, viewport] of [
    ["desktop", { width: 1440, height: 900 }],
    ["compact", { width: 533, height: 552 }],
    ["mobile", { width: 390, height: 844 }],
  ] as const) {
    await page.setViewportSize(viewport);
    await page.goto("/articles/go-syntax");
    if (name === "desktop") {
      await expect(page.getByRole("link", { name: "使用 GitHub 登录" })).toBeInViewport();
    } else {
      await page.getByRole("button", { name: "打开导航菜单" }).click();
      await expect(page.getByRole("menuitem", { name: "使用 GitHub 登录" })).toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(name + ".png") });
    if (name !== "desktop") {
      await page.getByRole("menuitem", { name: "使用 GitHub 登录" }).click();
      await expect(page.getByText("你取消了 GitHub 授权，可以重新尝试。", { exact: true })).toBeVisible();
    }
  }
});