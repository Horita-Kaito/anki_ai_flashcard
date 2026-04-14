import { http, HttpResponse } from "msw";
import type { Deck } from "@/entities/deck/types";

const API = "http://localhost:8000";

let mockDecks: Deck[] = [
  {
    id: 1,
    name: "Web開発",
    description: "Web開発関連の知識",
    default_domain_template_id: null,
    new_cards_limit: 20,
    review_limit: null,
    created_at: "2026-04-13T00:00:00+00:00",
    updated_at: "2026-04-13T00:00:00+00:00",
  },
];

export function resetMockDecks(): void {
  mockDecks = [
    {
      id: 1,
      name: "Web開発",
      description: "Web開発関連の知識",
      default_domain_template_id: null,
      new_cards_limit: 20,
      review_limit: null,
      created_at: "2026-04-13T00:00:00+00:00",
      updated_at: "2026-04-13T00:00:00+00:00",
    },
  ];
}

export const deckHandlers = [
  http.get(`${API}/api/v1/decks`, () =>
    HttpResponse.json({
      data: mockDecks,
      meta: {
        current_page: 1,
        last_page: 1,
        per_page: 20,
        total: mockDecks.length,
      },
    })
  ),

  http.get(`${API}/api/v1/decks/:id`, ({ params }) => {
    const deck = mockDecks.find((d) => d.id === Number(params.id));
    if (!deck) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json({ data: deck });
  }),

  http.post(`${API}/api/v1/decks`, async ({ request }) => {
    const body = (await request.json()) as Partial<Deck>;
    const created: Deck = {
      id: mockDecks.length + 1,
      name: body.name ?? "",
      description: body.description ?? null,
      default_domain_template_id: null,
      new_cards_limit: body.new_cards_limit ?? 20,
      review_limit: body.review_limit ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockDecks.push(created);
    return HttpResponse.json({ data: created }, { status: 201 });
  }),

  http.put(`${API}/api/v1/decks/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Partial<Deck>;
    const idx = mockDecks.findIndex((d) => d.id === Number(params.id));
    if (idx === -1) return new HttpResponse(null, { status: 404 });
    mockDecks[idx] = { ...mockDecks[idx], ...body };
    return HttpResponse.json({ data: mockDecks[idx] });
  }),

  http.delete(`${API}/api/v1/decks/:id`, ({ params }) => {
    mockDecks = mockDecks.filter((d) => d.id !== Number(params.id));
    return new HttpResponse(null, { status: 204 });
  }),
];
