import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownTextProps {
  text: string;
  className?: string;
}

/**
 * メモ本文・説明文などユーザー入力テキストを Markdown としてレンダリングする。
 * GFM (テーブル / 取り消し線 / 自動リンク / タスクリスト) 対応。
 *
 * 安全性: react-markdown のデフォルトで HTML 直書きは無効化されている (rehype-raw 未使用)。
 * `<script>` は描画されず、`&lt;script&gt;` としてテキスト表示される。
 */
export function MarkdownText({ text, className }: MarkdownTextProps) {
  return (
    <div
      className={`markdown-body text-sm leading-relaxed break-words ${className ?? ""}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl font-bold mt-3 mb-2 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-bold mt-3 mb-2 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold mt-2 mb-1 first:mt-0">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="my-2 first:mt-0 last:mb-0 whitespace-pre-wrap">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-5 my-2 space-y-0.5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 my-2 space-y-0.5">{children}</ol>
          ),
          li: ({ children }) => <li>{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-muted-foreground/40 pl-3 my-2 text-muted-foreground">
              {children}
            </blockquote>
          ),
          code: ({ className: cls, children }) => {
            const isBlock = /language-/.test(cls ?? "");
            if (isBlock) {
              return (
                <code
                  className={`block bg-muted rounded p-2 text-xs font-mono overflow-x-auto ${cls ?? ""}`}
                >
                  {children}
                </code>
              );
            }
            return (
              <code className="bg-muted rounded px-1 py-0.5 text-xs font-mono">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="bg-muted rounded p-2 my-2 overflow-x-auto text-xs">
              {children}
            </pre>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              className="text-primary underline underline-offset-2 hover:opacity-80"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-2">
              <table className="border-collapse text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border px-2 py-1 bg-muted/50 text-left font-medium">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border px-2 py-1">{children}</td>
          ),
          hr: () => <hr className="my-3 border-muted-foreground/30" />,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
