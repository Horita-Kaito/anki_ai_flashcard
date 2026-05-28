import { http, HttpResponse } from "msw";
import type { SystemSettingResponse } from "@/features/admin-system-setting";

const API = "*";

let mockSetting: SystemSettingResponse = {
  monthly_token_limit: null,
  created_at: null,
  updated_at: null,
};

export const adminSystemSettingHandlers = [
  http.get(`${API}/api/v1/admin/system-settings`, () =>
    HttpResponse.json({ data: mockSetting }),
  ),

  http.put(`${API}/api/v1/admin/system-settings`, async ({ request }) => {
    const body = (await request.json()) as Partial<SystemSettingResponse>;
    mockSetting = { ...mockSetting, ...body };
    return HttpResponse.json({ data: mockSetting });
  }),
];
