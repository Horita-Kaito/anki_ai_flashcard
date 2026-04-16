import { http, HttpResponse } from "msw";
import type { Card } from "@/entities/card/types";
import type { Tag } from "@/entities/tag/types";

const API = "http://localhost:8000";

let mockCards: Card[] = [];
let mockTags: Tag[] = [];

export const cardHandlers = [
  // Cards
  http.get(`${API}/api/v1/cards`, () =>
    HttpResponse.json({
      data: mockCards,
      meta: {
        current_page: 1,
        last_page: 1,
        per_page: 20,
        total: mockCards.length,
      },
    })
  ),

  http.get(`${API}/api/v1/cards/:id`, ({ params }) => {
    const card = mockCards.find((c) => c.id === Number(params.id));
    if (!card) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json({ data: card });
  }),

  http.post(`${API}/api/v1/cards`, async ({ request }) => {
    const body = (await request.json()) as Partial<Card>;
    const created: Card = {
      id: mockCards.length + 1,
      deck_id: body.deck_id ?? 1,
      domain_template_id: null,
      source_note_seed_id: null,
      source_ai_candidate_id: null,
      question: body.question ?? "",
      answer: body.answer ?? "",
      explanation: body.explanation ?? null,
      card_type: body.card_type ?? "basic_qa",
      is_suspended: false,
      tags: [],
      schedule: {
        state: "new",
        repetitions: 0,
        interval_days: 0,
        ease_factor: 2.5,
        due_at: new Date().toISOString(),
        lapse_count: 0,
        archived_at: null,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockCards.push(created);
    return HttpResponse.json({ data: created }, { status: 201 });
  }),

  http.put(`${API}/api/v1/cards/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Partial<Card>;
    const idx = mockCards.findIndex((c) => c.id === Number(params.id));
    if (idx === -1) return new HttpResponse(null, { status: 404 });
    mockCards[idx] = { ...mockCards[idx], ...body };
    return HttpResponse.json({ data: mockCards[idx] });
  }),

  http.delete(`${API}/api/v1/cards/:id`, ({ params }) => {
    mockCards = mockCards.filter((c) => c.id !== Number(params.id));
    return new HttpResponse(null, { status: 204 });
  }),

  // Tags
  http.get(`${API}/api/v1/tags`, () =>
    HttpResponse.json({ data: mockTags })
  ),

  http.post(`${API}/api/v1/tags`, async ({ request }) => {
    const body = (await request.json()) as { name: string };
    const tag: Tag = {
      id: mockTags.length + 1,
      name: body.name,
      created_at: new Date().toISOString(),
    };
    mockTags.push(tag);
    return HttpResponse.json({ data: tag }, { status: 201 });
  }),

  http.delete(`${API}/api/v1/tags/:id`, ({ params }) => {
    mockTags = mockTags.filter((t) => t.id !== Number(params.id));
    return new HttpResponse(null, { status: 204 });
  }),
];
