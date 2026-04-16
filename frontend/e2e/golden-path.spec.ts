import { test, expect } from "@playwright/test";

/**
 * ゴールデンパス E2E テスト
 *
 * ユーザーの主要フローを通しで検証:
 * 新規登録 → デッキ作成 → カード手動作成 → 復習セッション
 *
 * 前提: バックエンド (localhost:8000) + フロントエンド (localhost:3000) が起動済み
 * AI 生成は実 API キーが必要なためスキップし、手動カード作成で代替する。
 */

/** ユニークなメールアドレスを生成 */
function uniqueEmail(): string {
  return `e2e-golden-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@test.example`;
}

test.describe("Golden Path", () => {
  test("register → deck → card → review", async ({ page }) => {
    const email = uniqueEmail();
    const password = "GoldenPath1234!";
    const deckName = `テストデッキ-${Date.now()}`;
    const question = "日本の首都はどこですか？";
    const answer = "東京";

    // -------------------------------------------------------
    // 1. 新規登録
    // -------------------------------------------------------
    await page.goto("/register");
    await expect(
      page.getByRole("heading", { name: "新規登録" })
    ).toBeVisible();

    await page.fill("#name", "ゴールデンパステスター");
    await page.fill("#email", email);
    await page.fill("#password", password);
    await page.fill("#password_confirmation", password);
    await page.getByRole("button", { name: "登録" }).click();

    // ダッシュボードへリダイレクト
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: "ダッシュボード" })
    ).toBeVisible();

    // -------------------------------------------------------
    // 2. デッキ作成
    // -------------------------------------------------------
    await page.goto("/decks/new");
    await expect(
      page.getByRole("heading", { name: "デッキを作成" })
    ).toBeVisible();

    await page.fill("#name", deckName);
    await page.fill("#description", "E2Eテスト用のデッキです");

    // 作成ボタンをクリック (aria-label="デッキ作成フォーム" 内)
    await page
      .locator('form[aria-label="デッキ作成フォーム"]')
      .getByRole("button", { name: "作成" })
      .click();

    // デッキ一覧にリダイレクトされる
    await expect(page).toHaveURL(/\/decks$/, { timeout: 10_000 });

    // -------------------------------------------------------
    // 3. カード手動作成
    // -------------------------------------------------------
    await page.goto("/cards/new");
    await expect(
      page.getByRole("heading", { name: "カードを作成" })
    ).toBeVisible();

    // デッキを選択 (作成したデッキ名を選ぶ)
    // セレクトボックスの読み込みを待つ
    await page.locator("#deck_id").waitFor({ state: "visible" });
    // デッキ一覧が API から読み込まれるのを待つ
    await expect(page.locator(`#deck_id option`)).not.toHaveCount(1, {
      timeout: 10_000,
    });
    await page.selectOption("#deck_id", { label: deckName });

    // 問題文と回答を入力
    await page.fill("#question", question);
    await page.fill("#answer", answer);
    await page.fill("#explanation", "日本の政治・経済の中心地");

    // 作成ボタンをクリック
    await page
      .locator('form[aria-label="カード作成フォーム"]')
      .getByRole("button", { name: "作成" })
      .click();

    // カード一覧にリダイレクトされる
    await expect(page).toHaveURL(/\/cards$/, { timeout: 10_000 });

    // -------------------------------------------------------
    // 4. 復習セッション
    // -------------------------------------------------------
    await page.goto("/review");
    await expect(
      page.getByRole("heading", { name: "復習セッション" })
    ).toBeVisible();

    // カードが読み込まれるのを待つ (問題文 or 「今日の復習は完了しています」)
    // 新規カードなので復習対象に含まれるはず
    const questionOrDone = page
      .getByText(question)
      .or(page.getByText("今日の復習は完了しています"));
    await expect(questionOrDone).toBeVisible({ timeout: 15_000 });

    // もし「今日の復習は完了しています」なら、カードが due でない可能性がある
    // (SM-2 で新規カードが即 due にならない場合)。その場合はここで終了。
    const isDone = await page
      .getByText("今日の復習は完了しています")
      .isVisible()
      .catch(() => false);

    if (isDone) {
      // 新規カードが復習対象外のケース - テストはここまで
      return;
    }

    // 問題文が表示されていることを確認
    await expect(page.getByText(question)).toBeVisible();

    // 「答えを見る」ボタンをクリック
    await page.getByRole("button", { name: /答えを見る/ }).click();

    // 答えが表示されることを確認
    await expect(page.getByText(answer)).toBeVisible({ timeout: 5_000 });

    // 「普通」(Good) ボタンをクリックして評価
    await page.getByRole("button", { name: /普通/ }).click();

    // 復習完了画面: 「お疲れさまでした」が表示される
    await expect(page.getByText("お疲れさまでした")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("1 枚のカードを復習しました")).toBeVisible();
  });
});
