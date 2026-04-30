import { http, HttpResponse } from "msw";

const API = "http://localhost:8000";

export const reviewHandlers = [
  http.get(`${API}/api/v1/review-sessions/today`, () =>
    HttpResponse.json({
      data: {
        total_due: 0,
        new_count: 0,
        review_count: 0,
        cards: [],
      },
    })
  ),

  http.post(`${API}/api/v1/review-sessions/answer`, async ({ request }) => {
    const body = (await request.json()) as {
      card_id: number;
      rating: string;
    };
    return HttpResponse.json({
      data: {
        card_id: body.card_id,
        rating: body.rating,
        scheduler: "fsrs",
        updated_schedule: {
          state: "review",
          repetitions: 1,
          interval_days: 1,
          ease_factor: null,
          stability: 1.0,
          difficulty: 5.0,
          due_at: new Date().toISOString(),
          lapse_count: 0,
        },
      },
    });
  }),

  http.get(`${API}/api/v1/review-stats`, () =>
    HttpResponse.json({
      data: {
        today: {
          completed_count: 0,
          again_count: 0,
          hard_count: 0,
          good_count: 0,
          easy_count: 0,
        },
        week: {
          completed_count: 0,
          again_rate: 0,
        },
        month: {
          completed_count: 0,
        },
        overall: {
          total_reviews: 0,
        },
        by_deck: [],
      },
    })
  ),
];
