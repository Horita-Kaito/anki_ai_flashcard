import { test, expect } from "@playwright/test";

/**
 * 認証フロー E2E テスト
 *
 * 前提: バックエンド (localhost:8000) + フロントエンド (localhost:3000) が起動済み
 */

/** ユニークなメールアドレスを生成 */
function uniqueEmail(): string {
  return `e2e-auth-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@test.example`;
}

test.describe("Auth", () => {
  test("無効な認証情報でログインするとエラーが表示される", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: "ログイン" })
    ).toBeVisible();

    await page.fill("#email", "nonexistent@test.example");
    await page.fill("#password", "wrongpassword123");
    await page.getByRole("button", { name: "ログイン" }).click();

    // エラーメッセージが表示されることを確認
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 10_000 });
  });

  test("新規登録してログアウトし、再ログインできる", async ({ page }) => {
    const email = uniqueEmail();
    const password = "TestPass1234!";

    // --- 1. 新規登録 ---
    await page.goto("/register");
    await expect(
      page.getByRole("heading", { name: "新規登録" })
    ).toBeVisible();

    await page.fill("#name", "E2Eテストユーザー");
    await page.fill("#email", email);
    await page.fill("#password", password);
    await page.fill("#password_confirmation", password);
    await page.getByRole("button", { name: "登録" }).click();

    // ダッシュボードにリダイレクトされる
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: "ダッシュボード" })
    ).toBeVisible();

    // --- 2. ログアウト ---
    await page.getByRole("button", { name: "ログアウト" }).click();
    // ランディングページに戻る
    await expect(page).toHaveURL(/^\/$/, { timeout: 10_000 });

    // --- 3. 再ログイン ---
    await page.goto("/login");
    await page.fill("#email", email);
    await page.fill("#password", password);
    await page.getByRole("button", { name: "ログイン" }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: "ダッシュボード" })
    ).toBeVisible();
  });
});
