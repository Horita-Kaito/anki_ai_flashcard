import { describe, it, expect } from "vitest";
import { extractClozeAnswers, stripClozeMarkers } from "./cloze";

describe("extractClozeAnswers", () => {
  it("単一 cloze", () => {
    expect(extractClozeAnswers("RFID は {{c1::非接触}} 型の技術")).toEqual([
      "非接触",
    ]);
  });

  it("複数 cN を出現順で全部返す", () => {
    expect(
      extractClozeAnswers("{{c1::東京}}は{{c2::日本}}の首都")
    ).toEqual(["東京", "日本"]);
  });

  it("3桁 N も認識する", () => {
    expect(extractClozeAnswers("{{c123::abc}}")).toEqual(["abc"]);
  });

  it("cloze がない場合は空配列", () => {
    expect(extractClozeAnswers("ただの文章")).toEqual([]);
    expect(extractClozeAnswers("")).toEqual([]);
  });

  it("空中括弧は空文字として返す", () => {
    expect(extractClozeAnswers("X {{c1::}} Y")).toEqual([""]);
  });

  it("隣接 cloze", () => {
    expect(extractClozeAnswers("{{c1::a}}{{c2::b}}")).toEqual(["a", "b"]);
  });

  it("Unicode (絵文字含む)", () => {
    expect(extractClozeAnswers("{{c1::🇯🇵 日本}}")).toEqual(["🇯🇵 日本"]);
  });
});

describe("stripClozeMarkers", () => {
  it("単一 cloze の中身を残す", () => {
    expect(stripClozeMarkers("RFID は {{c1::非接触}} 型の技術")).toBe(
      "RFID は 非接触 型の技術"
    );
  });

  it("複数 cN を一括置換", () => {
    expect(
      stripClozeMarkers("{{c1::東京}}は{{c2::日本}}の首都")
    ).toBe("東京は日本の首都");
  });

  it("空中括弧は空文字に変換", () => {
    expect(stripClozeMarkers("X {{c1::}} Y")).toBe("X  Y");
  });

  it("cloze がない場合は元文字列のまま", () => {
    expect(stripClozeMarkers("ただの文章")).toBe("ただの文章");
  });
});
