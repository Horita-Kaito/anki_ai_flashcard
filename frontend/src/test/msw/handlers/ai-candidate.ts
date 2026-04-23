import { http, HttpResponse } from "msw";
import type { AiCardCandidate } from "@/entities/ai-candidate/types";

const API = "http://localhost:8000";

let mockCandidates: AiCardCandidate[] = [];

export const aiCandidateHandlers = [
  http.get(`${API}/api/v1/note-seeds/:id/candidates`, ({ params }) => {
    const list = mockCandidates.filter((c) => c.note_seed_id === Number(params.id));
    return HttpResponse.json({ data: list });
  }),

  http.post(
    `${API}/api/v1/note-seeds/:id/generate-candidates`,
    async ({ params, request }) => {
      const body = (await request.json()) as { count?: number };
      const count = body.count ?? 3;
      const noteSeedId = Number(params.id);
      const newCandidates: AiCardCandidate[] = Array.from({ length: count }).map(
        (_, i) => ({
          id: mockCandidates.length + i + 1,
          note_seed_id: noteSeedId,
          ai_generation_log_id: 1,
          provider: "fake",
          model_name: "gpt-4o-mini",
          question: `生成された質問 ${i + 1}`,
          answer: `生成された回答 ${i + 1}`,
          card_type: "basic_qa",
          focus_type: "definition",
          rationale: "テスト用",
          explanation: null,
          confidence: 0.8,
          suggested_deck_id: null,
          status: "pending",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      );
      mockCandidates.push(...newCandidates);
      return HttpResponse.json({ data: newCandidates }, { status: 201 });
    }
  ),

  http.post(
    `${API}/api/v1/note-seeds/:id/regenerate-candidates`,
    async ({ params, request }) => {
      const noteSeedId = Number(params.id);
      mockCandidates = mockCandidates.map((c) =>
        c.note_seed_id === noteSeedId && c.status === "pending"
          ? { ...c, status: "rejected" as const }
          : c
      );
      const body = (await request.json()) as { count?: number };
      const count = body.count ?? 3;
      const newCandidates: AiCardCandidate[] = Array.from({ length: count }).map(
        (_, i) => ({
          id: mockCandidates.length + i + 1,
          note_seed_id: noteSeedId,
          ai_generation_log_id: 2,
          provider: "fake",
          model_name: "gpt-4o-mini",
          question: `再生成 ${i + 1}`,
          answer: `再生成 ${i + 1}`,
          card_type: "basic_qa",
          focus_type: null,
          rationale: null,
          explanation: null,
          confidence: 0.7,
          suggested_deck_id: null,
          status: "pending",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      );
      mockCandidates.push(...newCandidates);
      return HttpResponse.json({ data: newCandidates }, { status: 201 });
    }
  ),

  http.put(
    `${API}/api/v1/ai-card-candidates/:id`,
    async ({ params, request }) => {
      const body = (await request.json()) as Partial<AiCardCandidate>;
      const idx = mockCandidates.findIndex((c) => c.id === Number(params.id));
      if (idx === -1) return new HttpResponse(null, { status: 404 });
      mockCandidates[idx] = { ...mockCandidates[idx], ...body };
      return HttpResponse.json({ data: mockCandidates[idx] });
    }
  ),

  http.post(`${API}/api/v1/ai-card-candidates/:id/reject`, ({ params }) => {
    const idx = mockCandidates.findIndex((c) => c.id === Number(params.id));
    if (idx === -1) return new HttpResponse(null, { status: 404 });
    mockCandidates[idx] = { ...mockCandidates[idx], status: "rejected" };
    return HttpResponse.json({ data: mockCandidates[idx] });
  }),

  http.post(`${API}/api/v1/ai-card-candidates/:id/restore`, ({ params }) => {
    const idx = mockCandidates.findIndex((c) => c.id === Number(params.id));
    if (idx === -1) return new HttpResponse(null, { status: 404 });
    mockCandidates[idx] = { ...mockCandidates[idx], status: "pending" };
    return HttpResponse.json({ data: mockCandidates[idx] });
  }),

  http.post(
    `${API}/api/v1/ai-card-candidates/batch-adopt`,
    async ({ request }) => {
      const body = (await request.json()) as {
        deck_id: number;
        candidate_ids: number[];
      };
      for (const id of body.candidate_ids) {
        const idx = mockCandidates.findIndex((c) => c.id === id);
        if (idx !== -1) {
          mockCandidates[idx] = { ...mockCandidates[idx], status: "adopted" };
        }
      }
      return HttpResponse.json(
        {
          data: {
            adopted_count: body.candidate_ids.length,
            cards: [],
          },
        },
        { status: 201 }
      );
    }
  ),

  http.post(
    `${API}/api/v1/ai-card-candidates/:id/adopt`,
    async ({ params }) => {
      const idx = mockCandidates.findIndex((c) => c.id === Number(params.id));
      if (idx === -1) return new HttpResponse(null, { status: 404 });
      mockCandidates[idx] = { ...mockCandidates[idx], status: "adopted" };
      return HttpResponse.json(
        {
          data: {
            id: 999,
            deck_id: 1,
            question: mockCandidates[idx].question,
            answer: mockCandidates[idx].answer,
            schedule: {
              state: "new",
              repetitions: 0,
              interval_days: 0,
              ease_factor: 2.5,
              due_at: new Date().toISOString(),
              lapse_count: 0,
            },
          },
        },
        { status: 201 }
      );
    }
  ),
];
