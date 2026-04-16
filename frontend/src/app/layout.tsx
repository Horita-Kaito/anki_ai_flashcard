import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Noto_Sans_JP } from "next/font/google";
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

// Mono: JetBrains Mono (kbd 表記・コード表示)
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://anki-ai-flashcard.example.com";

export const metadata: Metadata = {
  title: {
    default: "Anki AI Flashcard",
    template: "%s | Anki AI Flashcard",
  },
  description:
    "AI策問補助付きフラッシュカードアプリ。メモから AI がカード候補を生成し、間隔反復で記憶定着を支援します。",
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
  applicationName: "Anki AI Flashcard",
  manifest: "/manifest.json",
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Anki AI Flashcard",
    description:
      "メモを書くだけで AI がフラッシュカード候補を生成。科学的な間隔反復で記憶に定着させる学習支援アプリ。",
    url: SITE_URL,
    siteName: "Anki AI Flashcard",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Anki AI Flashcard",
    description:
      "メモを書くだけで AI がフラッシュカード候補を生成。科学的な間隔反復で記憶に定着させる学習支援アプリ。",
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
    title: "AnkiAI",
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
  themeColor: "#ffffff",
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
      className={`${inter.variable} ${notoJp.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-dvh flex flex-col font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
