import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { CreateShipmentRequest } from "@shared/schema";

export function useShipments() {
  return useQuery({
    queryKey: [api.shipments.list.path],
    queryFn: async () => {
      const res = await fetch(api.shipments.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch shipments");
      const data = await res.json();
      return api.shipments.list.responses[200].parse(data);
    },
  });
}

export function useCreateShipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateShipmentRequest) => {
      const res = await fetch(api.shipments.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create shipment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.shipments.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.batches.list.path] }); // Batch quantity updates
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
    },
  });
}
