import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://anki-ai-flashcard.example.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/decks", "/cards", "/review", "/settings", "/stats", "/notes", "/tags", "/templates"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
