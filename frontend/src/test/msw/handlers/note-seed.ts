import { http, HttpResponse } from "msw";
import type { NoteSeed } from "@/entities/note-seed/types";

const API = "http://localhost:8000";

let mockNotes: NoteSeed[] = [];

export const noteSeedHandlers = [
  http.get(`${API}/api/v1/note-seeds`, () =>
    HttpResponse.json({
      data: mockNotes,
      meta: {
        current_page: 1,
        last_page: 1,
        per_page: 20,
        total: mockNotes.length,
      },
    })
  ),

  http.get(`${API}/api/v1/note-seeds/:id`, ({ params }) => {
    const note = mockNotes.find((n) => n.id === Number(params.id));
    if (!note) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json({ data: note });
  }),

  http.post(`${API}/api/v1/note-seeds`, async ({ request }) => {
    const body = (await request.json()) as Partial<NoteSeed>;
    const created: NoteSeed = {
      id: mockNotes.length + 1,
      body: body.body ?? "",
      domain_template_id: body.domain_template_id ?? null,
      subdomain: body.subdomain ?? null,
      learning_goal: body.learning_goal ?? null,
      note_context: body.note_context ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockNotes.push(created);
    return HttpResponse.json({ data: created }, { status: 201 });
  }),

  http.put(`${API}/api/v1/note-seeds/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Partial<NoteSeed>;
    const idx = mockNotes.findIndex((n) => n.id === Number(params.id));
    if (idx === -1) return new HttpResponse(null, { status: 404 });
    mockNotes[idx] = { ...mockNotes[idx], ...body };
    return HttpResponse.json({ data: mockNotes[idx] });
  }),

  http.delete(`${API}/api/v1/note-seeds/:id`, ({ params }) => {
    mockNotes = mockNotes.filter((n) => n.id !== Number(params.id));
    return new HttpResponse(null, { status: 204 });
  }),
];
