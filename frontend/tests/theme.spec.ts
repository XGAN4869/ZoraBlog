import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/session", (route) =>
    route.fulfill({ json: { code: 0, data: { user: null } } }),
  );
});

test("theme reveals from the button in both directions and persists", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/blog");
  await page.evaluate(() => {
    const original = Element.prototype.animate;
    Element.prototype.animate = function (keyframes, options) {
      if (
        this === document.documentElement &&
        typeof options === "object" &&
        options.pseudoElement === "::view-transition-new(root)"
      ) {
        this.setAttribute("data-test-reveal", JSON.stringify({
          keyframes,
          options,
          theme: this.classList.contains("dark") ? "dark" : "light",
        }));
      }
      return original.call(this, keyframes, options);
    };
  });

  const root = page.locator("html");
  for (const theme of ["light", "dark"]) {
    const button = page.getByRole("button", {
      name: theme === "light" ? "切换到亮色主题" : "切换到暗色主题",
    });
    const bounds = await button.boundingBox();
    const viewport = page.viewportSize()!;
    const center = `${((bounds!.x + bounds!.width / 2) / viewport.width) * 100}% ${((bounds!.y + bounds!.height / 2) / viewport.height) * 100}%`;
    await root.evaluate((element) => element.removeAttribute("data-test-reveal"));
    await button.click();
    await expect(root).toHaveAttribute("data-test-reveal", /clipPath/);
    const reveal = JSON.parse((await root.getAttribute("data-test-reveal"))!);
    expect(reveal.theme).toBe(theme);
    expect(reveal.keyframes.clipPath[0]).toBe(`circle(0% at ${center})`);
    expect(reveal.options.duration).toBe(400);
    await expect(root).not.toHaveAttribute("data-theme-transition", "active");
    expect(await page.evaluate(() => localStorage.getItem("zora-theme"))).toBe(theme);
  }

  await page.reload();
  await expect(root).toHaveClass(/dark/);
  await expect(page.getByRole("button", { name: "切换到亮色主题" })).toBeVisible();
});

for (const mode of ["reduced motion", "unsupported browser", "snapshot failure", "start failure"]) {
  test(`theme still switches with ${mode}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: mode === "reduced motion" ? "reduce" : "no-preference" });
    await page.goto("/blog");
    if (mode === "unsupported browser") {
      await page.evaluate(() => {
        Object.defineProperty(document, "startViewTransition", { value: undefined });
      });
    } else if (mode === "start failure") {
      await page.evaluate(() => {
        document.startViewTransition = () => { throw new Error("Cannot capture snapshot"); };
      });
    } else if (mode === "snapshot failure") {
      await page.evaluate(() => {
        const start = document.startViewTransition.bind(document);
        document.startViewTransition = (...args) => {
          const transition = start(...args);
          transition.skipTransition();
          return transition;
        };
      });
    }

    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.getByRole("button", { name: "切换到亮色主题" }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await expect(page.locator("html")).not.toHaveAttribute("data-theme-transition", "active");
    await page.getByRole("button", { name: "切换到暗色主题" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.locator("html")).not.toHaveAttribute("data-theme-transition", "active");
    expect(errors).toEqual([]);
  });
}
