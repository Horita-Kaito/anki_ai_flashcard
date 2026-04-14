import { http, HttpResponse } from "msw";
import type { DomainTemplate } from "@/entities/domain-template/types";

const API = "http://localhost:8000";

let mockTemplates: DomainTemplate[] = [
  {
    id: 1,
    name: "Web開発",
    description: null,
    instruction_json: {
      goal: "Web開発の基礎を定着させる",
      priorities: ["定義を問う"],
      preferred_card_types: ["basic_qa"],
    },
    created_at: "2026-04-13T00:00:00+00:00",
    updated_at: "2026-04-13T00:00:00+00:00",
  },
];

export const domainTemplateHandlers = [
  http.get(`${API}/api/v1/domain-templates`, () =>
    HttpResponse.json({ data: mockTemplates })
  ),

  http.get(`${API}/api/v1/domain-templates/:id`, ({ params }) => {
    const template = mockTemplates.find((t) => t.id === Number(params.id));
    if (!template) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json({ data: template });
  }),

  http.post(`${API}/api/v1/domain-templates`, async ({ request }) => {
    const body = (await request.json()) as Partial<DomainTemplate>;
    const created: DomainTemplate = {
      id: mockTemplates.length + 1,
      name: body.name ?? "",
      description: body.description ?? null,
      instruction_json:
        body.instruction_json ?? { goal: "", priorities: [] },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockTemplates.push(created);
    return HttpResponse.json({ data: created }, { status: 201 });
  }),

  http.put(`${API}/api/v1/domain-templates/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Partial<DomainTemplate>;
    const idx = mockTemplates.findIndex((t) => t.id === Number(params.id));
    if (idx === -1) return new HttpResponse(null, { status: 404 });
    mockTemplates[idx] = { ...mockTemplates[idx], ...body };
    return HttpResponse.json({ data: mockTemplates[idx] });
  }),

  http.delete(`${API}/api/v1/domain-templates/:id`, ({ params }) => {
    mockTemplates = mockTemplates.filter((t) => t.id !== Number(params.id));
    return new HttpResponse(null, { status: 204 });
  }),
];
