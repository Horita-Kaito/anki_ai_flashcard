"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";
import { ShortcutHelpDialog } from "@/shared/ui/shortcut-help-dialog";
import { CommandPalette } from "@/shared/ui/command-palette";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="top-center" richColors />
      <CommandPalette />
      <ShortcutHelpDialog />
    </QueryClientProvider>
  );
}
