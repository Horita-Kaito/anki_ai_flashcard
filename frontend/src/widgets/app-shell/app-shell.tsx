import type { ReactNode } from "react";
import { BottomTabBar } from "./bottom-tab-bar";
import { DesktopSidebar } from "./desktop-sidebar";
import { Fab } from "./fab";

/**
 * 認証後の共通レイアウト
 * - モバイル: ボトムタブバー + 右下 FAB
 * - PC: 左サイドバー
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-dvh">
      <DesktopSidebar />
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">{children}</div>
      <Fab />
      <BottomTabBar />
    </div>
  );
}
