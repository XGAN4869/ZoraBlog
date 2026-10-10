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

test("hover categories open articles with directory and outline", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "主导航" });
  await nav.getByRole("button", { name: "前端", exact: true }).hover();
  const content = page.locator('[data-slot="navigation-menu-content"]');
  await expect(content.getByText("TypeScript", { exact: true })).toBeVisible();
  await content
    .getByRole("link", { name: "好的 React 组件，从划清边界开始" })
    .click();
  await expect(page).toHaveURL(/react-component-boundaries/);
  const directory = page.getByRole("navigation", { name: "文章分类目录" });
  const outline = page.getByRole("navigation", { name: "文章大纲" });
  await expect(directory.locator('a[aria-current="page"]')).toHaveText(
    "好的 React 组件，从划清边界开始",
  );
  const left = await directory.boundingBox();
  const center = await page.locator(".reading-content").boundingBox();
  const right = await outline.boundingBox();
  expect(left!.x + left!.width).toBeLessThan(center!.x);
  expect(right!.x).toBeGreaterThan(center!.x + center!.width);
  await outline.getByRole("link", { name: "状态放在需要它的共同父级" }).click();
  await expect(page).toHaveURL(/#section-1/);
  await expect(
    outline.getByRole("link", { name: "状态放在需要它的共同父级" }),
  ).toHaveAttribute("aria-current", "location");
});

test("navigation supports keyboard opening and escape", async ({ page }) => {
  await page.goto("/");
  const trigger = page
    .getByRole("navigation", { name: "主导航" })
    .getByRole("button", { name: "前端", exact: true });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const content = page.locator('[data-slot="navigation-menu-content"]');
  await expect(content).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(content).not.toBeVisible();
});

test("mobile sidebar navigates categories and closes after selection", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/articles/react-component-boundaries");
  await page.getByRole("button", { name: "打开文章目录" }).click();
  const directory = page.getByRole("navigation", { name: "文章分类目录" });
  await expect(directory).toBeVisible();
  await directory
    .getByRole("button", { name: "TypeScript", exact: true })
    .click();
  await directory
    .getByRole("link", { name: "用 TypeScript，把“不可能”写进类型" })
    .click();
  await expect(page).toHaveURL(/typescript-discriminated-unions/);
  await expect(directory).not.toBeVisible();
  await page.getByRole("button", { name: "打开文章大纲" }).click();
  await page
    .getByRole("dialog")
    .getByRole("link", { name: "用状态标签关联数据" })
    .click();
  await expect(page).toHaveURL(/#section-1/);
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("sidebar stays below the fixed top navigation and collapses from its upper right", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/articles/react-component-boundaries");
  const directory = page.getByRole("navigation", { name: "文章分类目录" });
  const initial = await directory.boundingBox();
  const header = await page.locator(".site-header").boundingBox();
  expect(header!.y).toBe(0);
  expect(initial!.x).toBe(0);
  expect(initial!.y).toBe(header!.height);
  expect(initial!.height).toBe(1000 - header!.height);
  const control = page.getByRole("button", {
    name: "折叠文章目录",
    exact: true,
  });
  const button = await control.boundingBox();
  expect(button!.x).toBeGreaterThan(initial!.width / 2);
  expect(button!.y).toBeLessThan(initial!.y + 48);
  const before = await page.locator(".reading-content").boundingBox();
  await control.click();
  await expect
    .poll(
      async () =>
        (await page.locator('[data-slot="sidebar-container"]').boundingBox())!
          .width,
    )
    .toBe(48);
  const collapsedHeader = await page.locator(".site-header").boundingBox();
  expect(collapsedHeader!.x).toBe(header!.x);
  expect(collapsedHeader!.width).toBe(header!.width);
  expect(
    (await page.locator(".reading-content").boundingBox())!.x,
  ).toBeLessThan(before!.x);
  await page.getByRole("button", { name: "展开文章目录", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await page.locator('[data-slot="sidebar-container"]').boundingBox())!
          .width,
    )
    .toBe(256);
  await expect(directory.locator('a[aria-current="page"]')).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 600));
  expect((await page.locator(".site-header").boundingBox())!.y).toBe(0);
  expect((await directory.boundingBox())!.y).toBe(header!.height);
});

test("category panels animate their height in both directions", async ({
  page,
}) => {
  await page.goto("/articles/react-component-boundaries");
  const directory = page.getByRole("navigation", { name: "文章分类目录" });
  const category = directory
    .locator('[data-slot="collapsible"]')
    .filter({ has: page.getByRole("button", { name: "Vue", exact: true }) });
  const trigger = category.getByRole("button", { name: "Vue", exact: true });
  const heights = () =>
    category.evaluate(async (element) => {
      const samples: number[] = [];
      for (let index = 0; index < 10; index++) {
        await new Promise(requestAnimationFrame);
        samples.push(
          element
            .querySelector('[data-slot="collapsible-content"]')
            ?.getBoundingClientRect().height ?? 0,
        );
      }
      return samples;
    });
  await trigger.click();
  const opening = await heights();
  expect(Math.max(...opening) - Math.min(...opening)).toBeGreaterThan(1);
  await expect(category.getByRole("link")).toBeVisible();
  await trigger.click();
  const closing = await heights();
  expect(Math.max(...closing) - Math.min(...closing)).toBeGreaterThan(1);
  await expect(category.getByRole("link")).not.toBeVisible();
});

test("sidebar and article animate together without moving the top navigation", async ({
  page,
}) => {
  await page.goto("/articles/react-component-boundaries");
  await page.getByRole("button", { name: "折叠文章目录", exact: true }).click();
  const samples = await page.evaluate(async () => {
    const frames: { width: number; gap: number; top: number }[] = [];
    for (let index = 0; index < 12; index++) {
      await new Promise(requestAnimationFrame);
      const sidebar = document
        .querySelector('[data-slot="sidebar-container"]')!
        .getBoundingClientRect();
      const article = document
        .querySelector(".article-page")!
        .getBoundingClientRect();
      const header = document
        .querySelector(".site-header")!
        .getBoundingClientRect();
      frames.push({
        width: sidebar.width,
        gap: article.left - sidebar.width,
        top: header.top,
      });
    }
    return frames;
  });
  expect(samples.some((frame) => frame.width > 50 && frame.width < 254)).toBe(
    true,
  );
  expect(
    samples.every((frame) => Math.abs(frame.gap - 32) < 2 && frame.top === 0),
  ).toBe(true);
  await expect
    .poll(
      async () =>
        (await page.locator('[data-slot="sidebar-container"]').boundingBox())!
          .width,
    )
    .toBe(48);
});

test("sidebar respects reduced motion for outer and inner collapse", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/articles/react-component-boundaries");
  await page.getByRole("button", { name: "折叠文章目录", exact: true }).click();
  await page.evaluate(() => new Promise(requestAnimationFrame));
  expect(
    (await page.locator('[data-slot="sidebar-container"]').boundingBox())!
      .width,
  ).toBe(48);
  await page.getByRole("button", { name: "展开文章目录", exact: true }).click();
  const directory = page.getByRole("navigation", { name: "文章分类目录" });
  await directory.getByRole("button", { name: "Vue", exact: true }).click();
  await expect(
    directory.getByRole("link", {
      name: "Vue 组合式函数：复用逻辑，也保留边界",
    }),
  ).toBeVisible();
  await directory.getByRole("button", { name: "Vue", exact: true }).click();
  await expect(
    directory.getByRole("link", {
      name: "Vue 组合式函数：复用逻辑，也保留边界",
    }),
  ).not.toBeVisible();
});

test("article switching animates the main area while preserving the sidebar", async ({
  page,
}) => {
  await page.goto("/articles/react-component-boundaries");
  await page.waitForLoadState("networkidle");
  const sidebar = await page
    .locator('[data-slot="sidebar-container"]')
    .elementHandle();
  const header = await page.locator(".site-header").boundingBox();
  const directory = page.getByRole("navigation", { name: "文章分类目录" });
  await directory.getByRole("button", { name: "Vue", exact: true }).click();
  await directory
    .getByRole("link", { name: "Vue 组合式函数：复用逻辑，也保留边界" })
    .click();
  await expect(page.locator(".reading-content h1")).toHaveText(
    "Vue 组合式函数：复用逻辑，也保留边界",
  );
  const frames = await page
    .locator(".reading-layout")
    .evaluate(async (element) => {
      const samples: { opacity: number; y: number }[] = [];
      for (let index = 0; index < 12; index++) {
        await new Promise(requestAnimationFrame);
        const style = getComputedStyle(element);
        samples.push({
          opacity: Number(style.opacity),
          y:
            style.transform === "none" ? 0 : new DOMMatrix(style.transform).m42,
        });
      }
      return samples;
    });
  const opacities = frames.map((frame) => frame.opacity);
  expect(Math.min(...opacities)).toBeLessThan(0.98);
  expect(Math.max(...opacities) - Math.min(...opacities)).toBeGreaterThan(0.05);
  expect(frames[0].y).toBeGreaterThan(0);
  expect(frames.at(-1)!.y).toBeLessThan(frames[0].y);
  expect(await sidebar!.evaluate((element) => element.isConnected)).toBe(true);
  expect(await page.locator(".site-header").boundingBox()).toEqual(header);
  await expect
    .poll(() =>
      page
        .locator(".reading-layout")
        .evaluate((element) => getComputedStyle(element).opacity),
    )
    .toBe("1");
  await page
    .getByRole("navigation", { name: "文章大纲" })
    .getByRole("link", { name: "有副作用时再使用 watch" })
    .click();
  expect(
    await page
      .locator(".reading-layout")
      .evaluate((element) => getComputedStyle(element).opacity),
  ).toBe("1");
  await page.goBack();
  await page.goBack();
  await expect(page.locator(".reading-content h1")).toHaveText(
    "好的 React 组件，从划清边界开始",
  );
  await page.goForward();
  await expect(page.locator(".reading-content h1")).toHaveText(
    "Vue 组合式函数：复用逻辑，也保留边界",
  );
});

test("article changes skip motion when reduced motion is enabled", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/articles/react-component-boundaries");
  const directory = page.getByRole("navigation", { name: "文章分类目录" });
  await directory.getByRole("button", { name: "Vue", exact: true }).click();
  await directory
    .getByRole("link", { name: "Vue 组合式函数：复用逻辑，也保留边界" })
    .click();
  await expect(page.locator(".reading-content h1")).toHaveText(
    "Vue 组合式函数：复用逻辑，也保留边界",
  );
  await page.evaluate(() => new Promise(requestAnimationFrame));
  expect(
    await page
      .locator(".reading-layout")
      .evaluate((element) => getComputedStyle(element).opacity),
  ).toBe("1");
  expect(
    await page
      .locator(".reading-layout")
      .evaluate((element) => getComputedStyle(element).transform),
  ).toBe("none");
});
