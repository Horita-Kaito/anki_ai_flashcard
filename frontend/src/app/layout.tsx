import type { Metadata, Viewport } from "next";
import {
  Inter,
  JetBrains_Mono,
  Noto_Sans_JP,
  Noto_Serif_JP,
  Source_Serif_4,
} from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

// Latin: Inter (洗練された sans、Linear/Vercel系)
const inter = Inter({
  variable: "--font-sans-latin",
  subsets: ["latin"],
  display: "swap",
});

// Japanese: Noto Sans JP (Google Fonts、日本語 UI で実績高い)
const notoJp = Noto_Sans_JP({
  variable: "--font-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  variable: "--font-serif-latin",
  subsets: ["latin"],
  display: "swap",
});

const notoSerifJp = Noto_Serif_JP({
  variable: "--font-serif-jp",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Mono: JetBrains Mono (kbd 表記・コード表示)
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://anki-ai-flashcard.example.com";

export const metadata: Metadata = {
  title: {
    default: "まとメモAI",
    template: "%s | まとメモAI",
  },
  description:
    "学習メモを、今日覚えるべき問いに変える作業台。AI が候補を出し、人がレビューして採用します。",
  keywords: [
    "フラッシュカード",
    "AI",
    "間隔反復",
    "暗記",
    "学習",
    "SM-2",
    "スペースドリピティション",
    "Anki",
    "flashcard",
    "spaced repetition",
  ],
  applicationName: "まとメモAI",
  manifest: "/manifest.json",
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "まとメモAI",
    description:
      "学習メモを、今日覚えるべき問いに変える作業台。AI が候補を出し、人がレビューして採用します。",
    url: SITE_URL,
    siteName: "まとメモAI",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "まとメモAI",
    description:
      "学習メモを、今日覚えるべき問いに変える作業台。AI が候補を出し、人がレビューして採用します。",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "まとメモAI",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#f7f0e4",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      suppressHydrationWarning
      className={`${inter.variable} ${notoJp.variable} ${sourceSerif.variable} ${notoSerifJp.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-dvh flex flex-col font-sans" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
