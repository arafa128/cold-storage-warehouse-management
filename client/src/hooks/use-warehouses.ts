import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { CreateWarehouseRequest, UpdateWarehouseRequest } from "@shared/schema";

export function useWarehouses() {
  return useQuery({
    queryKey: [api.warehouses.list.path],
    queryFn: async () => {
      const res = await fetch(api.warehouses.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch warehouses");
      const data = await res.json();
      return api.warehouses.list.responses[200].parse(data);
    },
  });
}

export function useCreateWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateWarehouseRequest) => {
      const res = await fetch(api.warehouses.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create warehouse");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.warehouses.list.path] }),
  });
}
