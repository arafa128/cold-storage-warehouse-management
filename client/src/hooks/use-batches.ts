import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { CreateBatchRequest, UpdateBatchRequest } from "@shared/schema";

export function useBatches() {
  return useQuery({
    queryKey: [api.batches.list.path],
    queryFn: async () => {
      const res = await fetch(api.batches.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch batches");
      const data = await res.json();
      return api.batches.list.responses[200].parse(data);
    },
  });
}

export function useCreateBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateBatchRequest) => {
      const res = await fetch(api.batches.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create batch");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.batches.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
    },
  });
}

export function useUpdateBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ lotNumber, ...updates }: { lotNumber: string } & UpdateBatchRequest) => {
      const url = buildUrl(api.batches.update.path, { lotNumber });
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update batch");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.batches.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
    },
  });
}
