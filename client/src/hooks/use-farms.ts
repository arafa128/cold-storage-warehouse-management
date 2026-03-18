import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { CreateFarmRequest } from "@shared/schema";

export function useFarms() {
  return useQuery({
    queryKey: [api.farms.list.path],
    queryFn: async () => {
      const res = await fetch(api.farms.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch farms");
      const data = await res.json();
      return api.farms.list.responses[200].parse(data);
    },
  });
}

export function useCreateFarm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateFarmRequest) => {
      const res = await fetch(api.farms.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create farm");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.farms.list.path] }),
  });
}
