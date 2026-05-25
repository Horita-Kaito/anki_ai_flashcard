"use client";

import { useState } from "react";
import type { AdminCreatedUserResponse } from "../schemas/admin-user-schemas";
import { UserCreationForm } from "./user-creation-form";
import { UserCreationResult } from "./user-creation-result";

/**
 * is_admin 認可は app/(app)/admin/layout.tsx で一元化されているため、
 * このコンポーネントは画面切り替えのみを担う。
 */
export function AdminUsersPageClient() {
  const [result, setResult] = useState<AdminCreatedUserResponse | null>(null);

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
