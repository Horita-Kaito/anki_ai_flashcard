import { http, HttpResponse } from "msw";

const API = "http://localhost:8000";

const mockUser = {
  id: 1,
  name: "テストユーザー",
  email: "test@example.com",
};

export const authHandlers = [
  http.get(`${API}/sanctum/csrf-cookie`, () =>
    new HttpResponse(null, { status: 204 })
  ),

  http.post(`${API}/api/v1/login`, () =>
    HttpResponse.json({ data: mockUser })
  ),

  http.post(`${API}/api/v1/register`, () =>
    HttpResponse.json({ data: mockUser }, { status: 201 })
  ),

  http.post(`${API}/api/v1/logout`, () =>
    new HttpResponse(null, { status: 204 })
  ),

  http.get(`${API}/api/v1/me`, () =>
    HttpResponse.json({ data: mockUser })
  ),
];
