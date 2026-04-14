import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * スモークテスト: アプリが最低限動作することを確認
 * より詳細なユーザーフローは Phase 1 以降に追加していく
 */
test.describe("Smoke", () => {
  test("ランディングページが表示される", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Anki AI Flashcard" })
    ).toBeVisible();
  });

  test("ログイン画面に遷移できる", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "ログイン" }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("ランディングページに a11y 違反がない", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
