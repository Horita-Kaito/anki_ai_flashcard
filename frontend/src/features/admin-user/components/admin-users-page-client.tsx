"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/entities/user/api/queries";
import type { AdminCreatedUserResponse } from "../schemas/admin-user-schemas";
import { UserCreationForm } from "./user-creation-form";
import { UserCreationResult } from "./user-creation-result";

export function AdminUsersPageClient() {
  const router = useRouter();
  const { data: me, isLoading } = useCurrentUser();
  const [result, setResult] = useState<AdminCreatedUserResponse | null>(null);

  const isForbidden = !isLoading && me && !me.is_admin;

  useEffect(() => {
    if (isForbidden) {
      router.replace("/dashboard");
    }
  }, [isForbidden, router]);

  if (isLoading || !me || isForbidden) {
    return (
      <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
        読み込み中...
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {result ? (
        <UserCreationResult result={result} onReset={() => setResult(null)} />
      ) : (
        <UserCreationForm onSuccess={setResult} />
      )}
    </div>
  );
}
