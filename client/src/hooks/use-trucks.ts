import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { CreateTruckRequest } from "@shared/schema";

export function useTrucks() {
  return useQuery({
    queryKey: [api.trucks.list.path],
    queryFn: async () => {
      const res = await fetch(api.trucks.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch trucks");
      const data = await res.json();
      return api.trucks.list.responses[200].parse(data);
    },
  });
}

export function useCreateTruck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateTruckRequest) => {
      const res = await fetch(api.trucks.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create truck");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.trucks.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.batches.list.path] }); // Truck creation generates batch
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
    },
  });
}
