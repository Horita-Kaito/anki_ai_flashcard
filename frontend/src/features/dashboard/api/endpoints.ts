import { apiClient } from "@/shared/api/client";
import type { DashboardSummary } from "@/entities/dashboard/types";
import { dashboardSummaryResponseSchema } from "@/entities/dashboard/schemas";
import { parseApiDataResponse } from "@/shared/api/parse-response";

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const res = await apiClient.get("/dashboard/summary");
  return parseApiDataResponse(dashboardSummaryResponseSchema, res);
}
