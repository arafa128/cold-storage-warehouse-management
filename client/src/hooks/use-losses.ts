import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { CreateLossRequest } from "@shared/schema";

export function useLosses() {
  return useQuery({
    queryKey: [api.losses.list.path],
    queryFn: async () => {
      const res = await fetch(api.losses.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch losses");
      const data = await res.json();
      return api.losses.list.responses[200].parse(data);
    },
  });
}

export function useCreateLoss() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateLossRequest) => {
      const res = await fetch(api.losses.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to record loss");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.losses.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.batches.list.path] }); // Batch quantity updates
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
    },
  });
}
