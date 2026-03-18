import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Warehouse as WarehouseIcon, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { WarehouseResponse, RoomResponse, BatchResponse, WarehouseUtilizationResponse } from "@shared/schema";

export default function Warehouses() {
  const { data: warehouses, isLoading: whLoading } = useQuery<WarehouseResponse[]>({ queryKey: ["/api/warehouses"] });
  const { data: rooms } = useQuery<RoomResponse[]>({ queryKey: ["/api/rooms"] });
  const { data: utilization } = useQuery<WarehouseUtilizationResponse[]>({ queryKey: ["/api/dashboard/warehouse-utilization"] });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [whOpen, setWhOpen] = useState(false);
  const [roomOpen, setRoomOpen] = useState(false);
  const [whForm, setWhForm] = useState({ name: "", location: "" });
  const [roomForm, setRoomForm] = useState({
    warehouseId: "", name: "", potatoType: "Potato", capacityTons: "", storageType: "bulk",
    maxTempC: "5", maxHumidityPct: "95", maxCo2Ppm: "4000",
  });

  const createWarehouse = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/warehouses", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/warehouse-utilization"] });
      setWhOpen(false);
      setWhForm({ name: "", location: "" });
      toast({ title: "Warehouse added" });
    },
  });

  const createRoom = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/rooms", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/warehouse-utilization"] });
      setRoomOpen(false);
      setRoomForm({ ...roomForm, name: "", capacityTons: "" });
      toast({ title: "Room added" });
    },
  });

  const handleCreateWarehouse = (e: React.FormEvent) => {
    e.preventDefault();
    createWarehouse.mutate(whForm);
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    createRoom.mutate({
      warehouseId: Number(roomForm.warehouseId),
      name: roomForm.name,
      potatoType: roomForm.potatoType,
      capacityKg: Math.round(Number(roomForm.capacityTons) * 1000),
      storageType: roomForm.storageType,
      isActive: true,
      maxTempC: roomForm.maxTempC,
      maxHumidityPct: roomForm.maxHumidityPct,
      maxCo2Ppm: roomForm.maxCo2Ppm,
    });
  };

  const utilMap = Object.fromEntries((utilization || []).map(u => [u.warehouseId, u]));

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Warehouses</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage cold storage locations and rooms</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={roomOpen} onOpenChange={setRoomOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2" data-testid="button-add-room">
                <LayoutGrid className="w-4 h-4" /> Add Room
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px]">
              <DialogHeader>
                <DialogTitle>Add Room</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateRoom} className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label>Warehouse *</Label>
                  <Select value={roomForm.warehouseId} onValueChange={v => setRoomForm({ ...roomForm, warehouseId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                    <SelectContent>
                      {(warehouses || []).map(w => <SelectItem key={w.id} value={w.id.toString()}>{w.name} – {w.location}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Room Name/ID *</Label>
                    <Input required value={roomForm.name} onChange={e => setRoomForm({ ...roomForm, name: e.target.value })} placeholder="e.g. F8" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Capacity (tons) *</Label>
                    <Input type="number" required min="1" step="0.1" value={roomForm.capacityTons} onChange={e => setRoomForm({ ...roomForm, capacityTons: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Product Type</Label>
                    <Select value={roomForm.potatoType} onValueChange={v => setRoomForm({ ...roomForm, potatoType: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Potato">Potato</SelectItem>
                        <SelectItem value="Corn">Corn</SelectItem>
                        <SelectItem value="Mixed">Mixed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Storage Type</Label>
                    <Select value={roomForm.storageType} onValueChange={v => setRoomForm({ ...roomForm, storageType: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bulk">Bulk</SelectItem>
                        <SelectItem value="pallets">Pallets</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="border-t pt-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Sensor Thresholds</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label>Max Temp (°C)</Label>
                      <Input type="number" step="0.1" value={roomForm.maxTempC} onChange={e => setRoomForm({ ...roomForm, maxTempC: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Max Humidity (%)</Label>
                      <Input type="number" step="0.1" value={roomForm.maxHumidityPct} onChange={e => setRoomForm({ ...roomForm, maxHumidityPct: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Max CO₂ (ppm)</Label>
                      <Input type="number" value={roomForm.maxCo2Ppm} onChange={e => setRoomForm({ ...roomForm, maxCo2Ppm: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={createRoom.isPending || !roomForm.warehouseId}>
                    {createRoom.isPending ? "Adding..." : "Add Room"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={whOpen} onOpenChange={setWhOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-add-warehouse">
                <Plus className="w-4 h-4" /> Add Warehouse
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Add Warehouse</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateWarehouse} className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label>Name *</Label>
                  <Input required value={whForm.name} onChange={e => setWhForm({ ...whForm, name: e.target.value })} placeholder="e.g. Warehouse A" />
                </div>
                <div className="space-y-1.5">
                  <Label>Location *</Label>
                  <Input required value={whForm.location} onChange={e => setWhForm({ ...whForm, location: e.target.value })} placeholder="e.g. Cairo, 6 October" />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={createWarehouse.isPending}>
                    {createWarehouse.isPending ? "Adding..." : "Add Warehouse"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {whLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2].map(i => <Skeleton key={i} className="h-56" />)}
        </div>
      ) : (warehouses || []).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <WarehouseIcon className="w-14 h-14 mb-4 opacity-15" />
          <p className="text-base font-semibold text-foreground">No warehouses configured</p>
          <p className="mt-1.5 text-sm">Add your first warehouse to start organizing cold storage.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(warehouses || []).map(wh => {
            const util = utilMap[wh.id];
            const whRooms = (rooms || []).filter(r => r.warehouseId === wh.id);
            const pct = util && util.totalCapacityKg > 0
              ? Math.round((util.usedKg / util.totalCapacityKg) * 100) : 0;

            return (
              <Card key={wh.id} className="border shadow-sm" data-testid={`card-warehouse-${wh.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base capitalize">{wh.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{wh.location}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">{whRooms.length} Rooms</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Utilization */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Utilization</span>
                      <span className="font-semibold">{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {Math.round((util?.usedKg || 0) / 1000).toLocaleString()}t / {Math.round((util?.totalCapacityKg || 0) / 1000).toLocaleString()}t
                    </p>
                  </div>

                  {/* Rooms */}
                  {whRooms.length > 0 && (
                    <div className="border-t pt-3 space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rooms</p>
                      <div className="space-y-1.5">
                        {whRooms.map(room => {
                          const ru = util?.rooms.find(r => r.roomId === room.id);
                          const rPct = ru && ru.capacityKg > 0 ? Math.round((ru.usedKg / ru.capacityKg) * 100) : 0;
                          return (
                            <div key={room.id} className="flex items-center gap-3 text-xs" data-testid={`row-room-${room.id}`}>
                              <span className="font-medium w-12 shrink-0">{room.name}</span>
                              <Progress value={rPct} className="h-1.5 flex-1" />
                              <span className="text-muted-foreground w-8 text-right tabular-nums">{rPct}%</span>
                              <span className="text-muted-foreground w-20 text-right tabular-nums">{Math.round((ru?.usedKg || 0) / 1000)}t / {Math.round(room.capacityKg / 1000)}t</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
