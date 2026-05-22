"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/entities/user/api/queries";
import { SystemSettingForm } from "./system-setting-form";

export function AdminSystemSettingsPageClient() {
  const router = useRouter();
  const { data: me, isLoading } = useCurrentUser();

  const isForbidden = !isLoading && me && !me.is_admin;

  useEffect(() => {
    if (isForbidden) {
      router.replace("/dashboard");
    }
  }, [isForbidden, router]);

  if (isLoading || !me || isForbidden) {
    return (
      <p
        className="text-sm text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        読み込み中...
      </p>
    );
  }

  return <SystemSettingForm />;
}
