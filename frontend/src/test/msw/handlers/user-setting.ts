import { http, HttpResponse } from "msw";
import type { UserSetting } from "@/entities/user-setting/types";

const API = "http://localhost:8000";

let mockSetting: UserSetting = {
  default_domain_template_id: null,
  default_ai_provider: "openai",
  default_ai_model: "gpt-4o-mini",
  default_generation_count: 3,
  desired_retention: 0.9,
};

export const userSettingHandlers = [
  http.get(`${API}/api/v1/settings`, () =>
    HttpResponse.json({ data: mockSetting })
  ),

  http.put(`${API}/api/v1/settings`, async ({ request }) => {
    const body = (await request.json()) as Partial<UserSetting>;
    mockSetting = { ...mockSetting, ...body };
    return HttpResponse.json({ data: mockSetting });
  }),
];
