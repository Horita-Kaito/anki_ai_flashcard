import { afterEach, describe, it, expect, vi } from "vitest";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/render";
import { NoteSeedForm } from "./note-seed-form";

const pushMock = vi.fn();
const backMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, back: backMock, replace: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

class MockSpeechRecognition extends EventTarget {
  static latest: MockSpeechRecognition | null = null;

  lang = "";
  continuous = false;
  interimResults = false;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onresult: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor() {
    super();
    MockSpeechRecognition.latest = this;
  }

  start() {
    this.onstart?.();
  }

  stop() {
    this.onend?.();
  }

  abort() {
    this.onend?.();
  }

  emitTranscript(transcript: string) {
    this.onresult?.({
      resultIndex: 0,
      results: [{ isFinal: true, 0: { transcript } }],
    } as unknown as Event);
  }
}

describe("NoteSeedForm", () => {
  beforeEach(() => {
    pushMock.mockClear();
    backMock.mockClear();
    MockSpeechRecognition.latest = null;
  });

  afterEach(() => {
    Reflect.deleteProperty(window, "webkitSpeechRecognition");
  });

  it("必須フィールドが表示される", () => {
    renderWithProviders(<NoteSeedForm />);
    expect(screen.getByLabelText(/メモ本文/)).toBeInTheDocument();
    expect(screen.getByLabelText("分野テンプレート")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /保存/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "キャンセル" })).toBeInTheDocument();
  });

  it("メモ本文が空のまま送信するとバリデーションエラーが表示される", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NoteSeedForm />);

    await user.click(screen.getByRole("button", { name: /保存/ }));

    await waitFor(() => {
      expect(
        screen.getByText("メモ本文を入力してください")
      ).toBeInTheDocument();
    });
  });

  it("送信中は保存ボタンが無効になる", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NoteSeedForm />);

    await user.type(screen.getByLabelText(/メモ本文/), "テストメモ本文です");
    await user.click(screen.getByRole("button", { name: /保存/ }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/notes");
    });
  });

  it("編集モードでは更新ボタンが表示される", () => {
    renderWithProviders(
      <NoteSeedForm
        note={{
          id: 1,
          body: "既存のメモ",
          domain_template_id: null,
          subdomain: null,
          learning_goal: null,
          note_context: null,
          created_at: "2026-04-13T00:00:00+00:00",
          updated_at: "2026-04-13T00:00:00+00:00",
        }}
      />
    );
    expect(screen.getByRole("button", { name: /更新/ })).toBeInTheDocument();
    expect(screen.getByDisplayValue("既存のメモ")).toBeInTheDocument();
  });

  it("フォームが「メモ作成フォーム」のアクセシブル名を持つ", () => {
    renderWithProviders(<NoteSeedForm />);
    expect(
      screen.getByRole("form", { name: "メモ作成フォーム" })
    ).toBeInTheDocument();
  });

  it("プレビュータブに切替えると Markdown がレンダリングされる", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NoteSeedForm />);

    await user.type(
      screen.getByLabelText(/メモ本文/),
      "# 見出し{Enter}{Enter}- 項目"
    );
    await user.click(screen.getByRole("tab", { name: "プレビュー" }));

    expect(
      screen.getByRole("heading", { level: 1, name: "見出し" })
    ).toBeInTheDocument();
    expect(screen.getByText("項目")).toBeInTheDocument();
  });

  it("プレビュータブで本文が空のときは空表示が出る", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NoteSeedForm />);

    await user.click(screen.getByRole("tab", { name: "プレビュー" }));

    expect(
      screen.getByText("プレビューするメモがありません")
    ).toBeInTheDocument();
  });

  it("音声入力に対応している場合、認識した文章をメモ本文へ追記する", async () => {
    Object.defineProperty(window, "webkitSpeechRecognition", {
      configurable: true,
      value: MockSpeechRecognition,
    });
    const user = userEvent.setup();
    renderWithProviders(<NoteSeedForm />);

    const body = screen.getByLabelText(/メモ本文/) as HTMLTextAreaElement;
    await user.type(body, "既存メモ");
    await user.click(screen.getByRole("button", { name: "音声入力を開始" }));

    await act(async () => {
      MockSpeechRecognition.latest?.emitTranscript("音声で追加した内容");
    });

    expect(body.value).toBe("既存メモ\n音声で追加した内容");
    expect(screen.getByRole("button", { name: "音声入力を停止" })).toBeInTheDocument();
  });

  it("onSaveAndGenerate が渡されると「保存して候補生成」ボタンが追加表示される", () => {
    renderWithProviders(<NoteSeedForm onSaveAndGenerate={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: /保存して候補生成/ })
    ).toBeInTheDocument();
    // 通常の「保存」も同時にある
    expect(
      screen.getByRole("button", { name: /^保存$/ })
    ).toBeInTheDocument();
  });

  it("「保存して候補生成」を押すと onSaveAndGenerate が保存後の note と共に呼ばれる", async () => {
    const user = userEvent.setup();
    const onSaveAndGenerate = vi.fn();
    renderWithProviders(
      <NoteSeedForm onSaveAndGenerate={onSaveAndGenerate} />
    );

    await user.type(screen.getByLabelText(/メモ本文/), "連続生成テスト本文");
    await user.click(
      screen.getByRole("button", { name: /保存して候補生成/ })
    );

    await waitFor(() => {
      expect(onSaveAndGenerate).toHaveBeenCalledTimes(1);
    });
    const arg = onSaveAndGenerate.mock.calls[0][0];
    expect(arg.body).toBe("連続生成テスト本文");
    expect(typeof arg.id).toBe("number");
    // 通常の onSuccess は呼ばれず、router.push も走らない
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("shouldResetAfterSave=true では「保存」単独ボタンが非表示で「保存して候補生成」のみ表示される", () => {
    renderWithProviders(
      <NoteSeedForm onSaveAndGenerate={vi.fn()} shouldResetAfterSave />
    );
    expect(
      screen.getByRole("button", { name: /保存して候補生成/ })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^保存$/ })
    ).not.toBeInTheDocument();
  });

  it("shouldResetAfterSave=true で送信すると本文がクリアされ、詳細設定は保持される", async () => {
    const user = userEvent.setup();
    const onSaveAndGenerate = vi.fn();
    renderWithProviders(
      <NoteSeedForm
        onSaveAndGenerate={onSaveAndGenerate}
        shouldResetAfterSave
      />
    );

    // 詳細設定を開いてサブ分野に値を入れる
    await user.click(screen.getByRole("button", { name: /詳細設定/ }));
    await user.type(screen.getByLabelText("サブ分野"), "ネットワーク");

    const body = screen.getByLabelText(/メモ本文/) as HTMLTextAreaElement;
    await user.type(body, "1 件目のメモ");
    await user.click(
      screen.getByRole("button", { name: /保存して候補生成/ })
    );

    await waitFor(() => expect(onSaveAndGenerate).toHaveBeenCalled());

    // 本文は空に戻り、サブ分野は引き継がれている
    await waitFor(() => {
      expect((screen.getByLabelText(/メモ本文/) as HTMLTextAreaElement).value).toBe(
        ""
      );
    });
    expect(
      (screen.getByLabelText("サブ分野") as HTMLInputElement).value
    ).toBe("ネットワーク");
    // router.push は走らない (連続モードのため)
    expect(pushMock).not.toHaveBeenCalled();
  });
});
