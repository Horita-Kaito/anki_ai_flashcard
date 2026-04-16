import { NextResponse, type NextRequest } from "next/server";

/**
 * セッション Cookie 名
 *
 * Laravel の session.php は `Str::slug(APP_NAME) . '-session'` を既定値にするため
 * APP_NAME に応じて変わり得る。環境変数で上書き可能にしておく。
 *
 * httpOnly Cookie はブラウザ JS から読めないが、Next.js middleware は
 * リクエストヘッダの Cookie を直接読むため検出できる。
 */
const SESSION_COOKIE_NAME =
  process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME ?? "laravel-session";

/**
 * 認証ガード middleware
 *
 * Sanctum SPA認証 ではセッション Cookie の有無で認証状態を大まかに判定する。
 * 厳密な検証は各ページ/コンポーネント側で `useCurrentUser()` が行う。
 */
export function middleware(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE_NAME);

  // 未認証で (app) ルートにアクセス → /login へ
  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * (app) route group 配下のみを対象
     * Next.js の matcher は route group を認識しないので具体パスで列挙
     */
    "/dashboard/:path*",
    "/decks/:path*",
    "/cards/:path*",
    "/notes/:path*",
    "/review/:path*",
    "/templates/:path*",
    "/stats/:path*",
    "/settings/:path*",
    "/decks",
    "/templates",
    "/notes",
    "/cards",
    "/settings",
    "/tags",
    "/tags/:path*",
    "/stats",
    "/review",
    "/onboarding",
  ],
};
