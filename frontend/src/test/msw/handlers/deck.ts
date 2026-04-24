import { http, HttpResponse } from "msw";
import type { Deck } from "@/entities/deck/types";

const API = "http://localhost:8000";

const initialDecks = (): Deck[] => [
  {
    id: 1,
    parent_id: null,
    name: "Web開発",
    description: "Web開発関連の知識",
    default_domain_template_id: null,
    display_order: 0,
    created_at: "2026-04-13T00:00:00+00:00",
    updated_at: "2026-04-13T00:00:00+00:00",
  },
];

let mockDecks: Deck[] = initialDecks();

export function resetMockDecks(): void {
  mockDecks = initialDecks();
}

export const deckHandlers = [
  http.get(`${API}/api/v1/decks`, () =>
    HttpResponse.json({ data: mockDecks })
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
      parent_id: body.parent_id ?? null,
      name: body.name ?? "",
      description: body.description ?? null,
      default_domain_template_id: body.default_domain_template_id ?? null,
      display_order: mockDecks.length,
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

  http.post(`${API}/api/v1/decks/tree`, async ({ request }) => {
    const body = (await request.json()) as {
      nodes: Array<{ id: number; parent_id: number | null; display_order: number }>;
    };
    for (const node of body.nodes) {
      const idx = mockDecks.findIndex((d) => d.id === node.id);
      if (idx === -1) continue;
      mockDecks[idx] = {
        ...mockDecks[idx],
        parent_id: node.parent_id,
        display_order: node.display_order,
      };
    }
    return new HttpResponse(null, { status: 204 });
  }),
];
