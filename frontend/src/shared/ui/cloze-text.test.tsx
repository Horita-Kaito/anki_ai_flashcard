import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ClozeText } from "./cloze-text";

describe("ClozeText", () => {
  it("front モードで答えを伏字 (点線ボックス) として表示する", () => {
    render(
      <ClozeText
        text="RFID は電磁波で情報を読み取る {{c1::非接触}} 型の技術"
        mode="front"
      />,
    );
    // 答えの語が表示されない (text-transparent + 中身は   に置換)
    expect(screen.queryByText(/非接触/)).toBeNull();
    expect(screen.getByLabelText("伏字")).toBeInTheDocument();
  });

  it("back モードで答えをハイライト表示する", () => {
    render(
      <ClozeText
        text="RFID は電磁波で情報を読み取る {{c1::非接触}} 型の技術"
        mode="back"
      />,
    );
    expect(screen.getByText("非接触")).toBeInTheDocument();
  });

  it("cloze 記法を含まないテキストはそのまま描画する", () => {
    render(<ClozeText text="ただの問題文" mode="front" />);
    expect(screen.getByText("ただの問題文")).toBeInTheDocument();
  });

  it("複数の {{cN::xxx}} を全て処理する", () => {
    render(
      <ClozeText
        text="{{c1::A}} と {{c2::B}} と {{c3::C}}"
        mode="back"
      />,
    );
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.getByText("C")).toBeInTheDocument();
  });

  it("中身空 {{c1::}} でも (front) 描画でクラッシュしない", () => {
    // バックエンドでダウングレードされる想定だが、念のため UI も壊れない
    render(<ClozeText text="X {{c1::}} Y" mode="front" />);
    expect(screen.getByLabelText("伏字")).toBeInTheDocument();
  });
});
