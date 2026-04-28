import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarkdownText } from "./markdown-text";

describe("MarkdownText", () => {
  it("見出し・リスト・強調を要素としてレンダリングする", () => {
    render(
      <MarkdownText text={"# 見出し\n\n- one\n- two\n\n**強い**"} />
    );
    expect(screen.getByRole("heading", { level: 1, name: "見出し" }))
      .toBeInTheDocument();
    expect(screen.getByText("one")).toBeInTheDocument();
    expect(screen.getByText("two")).toBeInTheDocument();
    expect(screen.getByText("強い").tagName.toLowerCase()).toBe("strong");
  });

  it("リンクは新規タブで開く属性が付く", () => {
    render(<MarkdownText text="[link](https://example.com)" />);
    const link = screen.getByRole("link", { name: "link" });
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toMatch(/noopener/);
  });

  it("HTML 直書きは raw として描画されない (XSS 防御)", () => {
    const { container } = render(
      <MarkdownText text={'<script>alert(1)</script>普通の文字'} />
    );
    expect(container.querySelector("script")).toBeNull();
    expect(screen.getByText(/普通の文字/)).toBeInTheDocument();
  });

  it("インラインコードと code blocks を区別する", () => {
    const { container } = render(
      <MarkdownText text={"`inline` と\n\n```\nblock\n```"} />
    );
    expect(screen.getByText("inline").tagName.toLowerCase()).toBe("code");
    expect(container.querySelector("pre")).not.toBeNull();
  });
});
