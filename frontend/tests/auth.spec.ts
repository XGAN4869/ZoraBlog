import { test, expect } from "@playwright/test";

const visitor = { id: 7, username: "visitor", email: "visitor@example.com" };

test("registration, refresh, logout and email login use the API without browser credential storage", async ({ page }) => {
  let signedIn = false;
  await page.route("**/api/session", (route) => route.fulfill({ json: { code: 0, data: { user: signedIn ? visitor : null } } }));
  await page.route("**/api/register", async (route) => {
    expect(route.request().postDataJSON()).toEqual({ username: "visitor", email: visitor.email, password: "valid-password", remember: false });
    signedIn = true;
    await route.fulfill({ status: 201, json: { code: 0, data: { user: visitor } } });
  });
  await page.route("**/api/login", async (route) => {
    expect(route.request().postDataJSON()).toEqual({ username: visitor.email, password: "valid-password", remember: true });
    signedIn = true;
    await route.fulfill({ json: { code: 0, data: { user: visitor } } });
  });
  await page.route("**/api/logout", async (route) => { signedIn = false; await route.fulfill({ json: { code: 0 } }); });
  await page.goto("/register");
  await page.getByLabel("用户名", { exact: true }).fill("visitor");
  await page.getByLabel("邮箱地址").fill(visitor.email);
  await page.getByLabel("密码", { exact: true }).fill("valid-password");
  await page.getByLabel("确认密码").fill("valid-password");
  await page.getByRole("button", { name: "注册并登录", exact: true }).click();
  await expect(page).toHaveURL("/blog");
  await page.reload();
  await page.getByRole("button", { name: "账户：visitor" }).click();
  await page.getByRole("menuitem", { name: "退出登录" }).click();
  await expect(page.getByRole("button", { name: "账户：visitor" })).toHaveCount(0);
  await page.goto("/login?redirect=https://evil.example");
  await page.getByLabel("用户名或邮箱").fill(visitor.email);
  await page.getByLabel("密码", { exact: true }).fill("valid-password");
  await page.getByRole("checkbox", { name: "保持登录 30 天" }).check();
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page).toHaveURL("/blog");
  const storage = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
  expect(storage).not.toContain("valid-password");
  expect(storage).not.toContain("visitor");
});

test("invalid credentials and duplicate accounts show errors without successful navigation", async ({ page }) => {
  await page.route("**/api/session", (route) => route.fulfill({ json: { code: 0, data: { user: null } } }));
  await page.route("**/api/login", (route) => route.fulfill({ status: 401, json: { code: 401, message: "用户名或密码错误" } }));
  await page.route("**/api/register", (route) => route.fulfill({ status: 409, json: { code: 409, message: "用户名或邮箱已被使用" } }));
  await page.goto("/login");
  await page.getByLabel("用户名或邮箱").fill(visitor.email);
  await page.getByLabel("密码", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText("用户名或密码错误");
  await expect(page).toHaveURL("/login");
  await page.getByRole("link", { name: "注册账号", exact: true }).click();
  await page.getByLabel("用户名", { exact: true }).fill("visitor");
  await page.getByLabel("邮箱地址").fill(visitor.email);
  await page.getByLabel("密码", { exact: true }).fill("valid-password");
  await page.getByLabel("确认密码").fill("mismatched-password");
  await page.getByRole("button", { name: "注册并登录", exact: true }).click();
  await expect(page.getByText("两次输入的密码不一致")).toBeVisible();
  await page.getByLabel("确认密码").fill("valid-password");
  await page.getByRole("button", { name: "注册并登录", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText("用户名或邮箱已被使用");
});
