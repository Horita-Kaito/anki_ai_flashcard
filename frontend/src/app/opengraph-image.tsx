import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Anki AI Flashcard - メモを、記憶に残る問いへ。";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Icon circle */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 80,
            height: 80,
            borderRadius: 20,
            background: "rgba(255, 255, 255, 0.15)",
            marginBottom: 24,
          }}
        >
          <svg
            width="44"
            height="44"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
          </svg>
        </div>

        {/* App name */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: "white",
            letterSpacing: "-0.02em",
            marginBottom: 16,
          }}
        >
          Anki AI Flashcard
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: "rgba(255, 255, 255, 0.7)",
            letterSpacing: "0.05em",
          }}
        >
          メモを、記憶に残る問いへ。
        </div>

        {/* Bottom badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 48,
            padding: "8px 20px",
            borderRadius: 999,
            background: "rgba(255, 255, 255, 0.1)",
            color: "rgba(255, 255, 255, 0.6)",
            fontSize: 16,
          }}
        >
          AI x 間隔反復 x フラッシュカード
        </div>
      </div>
    ),
    { ...size },
  );
}
