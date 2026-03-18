import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { CreateSupplierRequest } from "@shared/schema";

export function useSuppliers() {
  return useQuery({
    queryKey: [api.suppliers.list.path],
    queryFn: async () => {
      const res = await fetch(api.suppliers.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch suppliers");
      const data = await res.json();
      return api.suppliers.list.responses[200].parse(data);
    },
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateSupplierRequest) => {
      const res = await fetch(api.suppliers.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create supplier");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.suppliers.list.path] }),
  });
}
