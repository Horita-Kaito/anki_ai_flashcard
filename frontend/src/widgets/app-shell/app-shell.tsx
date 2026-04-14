import type { ReactNode } from "react";
import { BottomTabBar } from "./bottom-tab-bar";
import { DesktopSidebar } from "./desktop-sidebar";

/**
 * 認証後の共通レイアウト
 * - モバイル: ボトムタブバー (md未満で表示)
 * - PC: 左サイドバー (md以上で表示)
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-dvh">
      <DesktopSidebar />
      <div className="flex-1 flex flex-col min-w-0">{children}</div>
      <BottomTabBar />
    </div>
  );
}
