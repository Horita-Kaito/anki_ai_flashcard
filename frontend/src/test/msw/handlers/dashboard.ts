import { http, HttpResponse } from "msw";

const API = "http://localhost:8000";

export const dashboardHandlers = [
  http.get(`${API}/api/v1/dashboard/summary`, () =>
    HttpResponse.json({
      data: {
        due_count_today: 5,
        new_cards_count: 3,
        total_cards: 42,
        recent_notes: [],
        recent_cards: [],
        ai_usage: {
          today_calls: 2,
          month_calls: 45,
          month_cost_usd: 0.014,
        },
      },
    })
  ),
];
