"use client";

import { SystemSettingForm } from "./system-setting-form";

/**
 * is_admin 認可は app/(app)/admin/layout.tsx で一元化されているため、
 * このコンポーネントは form をマウントするだけ。
 */
export function AdminSystemSettingsPageClient() {
  return <SystemSettingForm />;
}
