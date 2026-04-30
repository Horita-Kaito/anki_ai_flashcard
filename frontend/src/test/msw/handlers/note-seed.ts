import { http, HttpResponse } from "msw";
import type { NoteSeed } from "@/entities/note-seed/types";

const API = "http://localhost:8000";

let mockNotes: NoteSeed[] = [];

export const noteSeedHandlers = [
  http.get(`${API}/api/v1/note-seeds`, ({ request }) => {
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
    const perPage = Math.max(
      1,
      Math.min(100, Number(url.searchParams.get("per_page") ?? "20")),
    );
    const total = mockNotes.length;
    const lastPage = Math.max(1, Math.ceil(total / perPage));
    const start = (page - 1) * perPage;
    const slice = mockNotes.slice(start, start + perPage);
    return HttpResponse.json({
      data: slice,
      meta: {
        current_page: page,
        last_page: lastPage,
        per_page: perPage,
        total,
      },
    });
  }),

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

  http.post(
    `${API}/api/v1/note-seeds/bulk-generate-candidates`,
    async ({ request }) => {
      const body = (await request.json()) as { note_seed_ids: number[] };
      const dispatched = body.note_seed_ids.map((id, i) => ({
        note_seed_id: id,
        log_id: i + 1,
        status: "queued",
      }));
      return HttpResponse.json(
        { data: { dispatched, skipped: [], failed: [] } },
        { status: 202 }
      );
    }
  ),
];
