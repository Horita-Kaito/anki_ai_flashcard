import { NextResponse, type NextRequest } from "next/server";

/**
 * 認証ガード middleware
 *
 * Sanctum SPA認証 では laravel_session Cookie の有無で認証状態を大まかに判定する。
 * 厳密な検証は各ページ/コンポーネント側で `useCurrentUser()` が行う。
 */
export function middleware(request: NextRequest) {
  const hasSession = request.cookies.has("laravel_session");

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
  ],
};
