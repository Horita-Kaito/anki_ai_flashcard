import { apiClient } from "@/shared/api/client";
import type { DashboardSummary } from "@/entities/dashboard/types";

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const res = await apiClient.get<{ data: DashboardSummary }>(
    "/dashboard/summary"
  );
  return res.data.data;
}
