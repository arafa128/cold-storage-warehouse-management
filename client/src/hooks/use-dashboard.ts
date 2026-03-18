import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { DashboardStatsResponse } from "@shared/schema";

export function useDashboardStats() {
  return useQuery({
    queryKey: [api.dashboard.stats.path],
    queryFn: async () => {
      const res = await fetch(api.dashboard.stats.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch dashboard stats");
      const data = await res.json();
      const parsed = api.dashboard.stats.responses[200].safeParse(data);
      if (!parsed.success) {
        console.error("Zod parse error:", parsed.error);
        return data as DashboardStatsResponse; // fallback
      }
      return parsed.data;
    },
    refetchInterval: 30000, // Refresh every 30s
  });
}
