import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { CreateRoomRequest, UpdateRoomRequest } from "@shared/schema";

export function useRooms() {
  return useQuery({
    queryKey: [api.rooms.list.path],
    queryFn: async () => {
      const res = await fetch(api.rooms.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch rooms");
      const data = await res.json();
      return api.rooms.list.responses[200].parse(data);
    },
  });
}

export function useCreateRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateRoomRequest) => {
      const res = await fetch(api.rooms.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create room");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.rooms.list.path] }),
  });
}
