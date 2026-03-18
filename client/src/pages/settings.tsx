import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { WarehouseResponse, RoomResponse, SupplierResponse, FarmResponse } from "@shared/schema";

export default function Settings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: warehouses } = useQuery<WarehouseResponse[]>({ queryKey: ["/api/warehouses"] });
  const { data: rooms } = useQuery<RoomResponse[]>({ queryKey: ["/api/rooms"] });
  const { data: suppliers } = useQuery<SupplierResponse[]>({ queryKey: ["/api/suppliers"] });
  const { data: farms } = useQuery<FarmResponse[]>({ queryKey: ["/api/farms"] });

  const [whName, setWhName] = useState("");
  const [whLocation, setWhLocation] = useState("");
  const [roomWhId, setRoomWhId] = useState("");
  const [roomName, setRoomName] = useState("");
  const [roomType, setRoomType] = useState("Potato");
  const [roomCapTons, setRoomCapTons] = useState("");
  const [storageType, setStorageType] = useState("bulk");
  const [maxTemp, setMaxTemp] = useState("5");
  const [maxHumidity, setMaxHumidity] = useState("95");
  const [maxCo2, setMaxCo2] = useState("4000");

  const [supName, setSupName] = useState("");
  const [supContact, setSupContact] = useState("");
  const [farmName, setFarmName] = useState("");
  const [farmSupId, setFarmSupId] = useState("");
  const [farmLocation, setFarmLocation] = useState("");

  const createWarehouse = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/warehouses", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouses"] });
      setWhName(""); setWhLocation("");
      toast({ title: "Warehouse created" });
    },
  });

  const createRoom = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/rooms", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      setRoomName(""); setRoomCapTons("");
      toast({ title: "Room created" });
    },
  });

  const createSupplier = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/suppliers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setSupName(""); setSupContact("");
      toast({ title: "Supplier added" });
    },
  });

  const createFarm = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/farms", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/farms"] });
      setFarmName(""); setFarmSupId(""); setFarmLocation("");
      toast({ title: "Farm added" });
    },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Configure facilities, suppliers, and system data</p>
      </div>

      <Tabs defaultValue="facilities">
        <TabsList>
          <TabsTrigger value="facilities">Facilities</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers & Farms</TabsTrigger>
        </TabsList>

        <TabsContent value="facilities" className="mt-5 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Add Warehouse */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Add Warehouse</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={e => { e.preventDefault(); createWarehouse.mutate({ name: whName, location: whLocation }); }} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Name *</Label>
                    <Input required value={whName} onChange={e => setWhName(e.target.value)} placeholder="e.g. North Warehouse" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Location *</Label>
                    <Input required value={whLocation} onChange={e => setWhLocation(e.target.value)} placeholder="e.g. Cairo, Giza" />
                  </div>
                  <Button type="submit" size="sm" className="w-full" disabled={createWarehouse.isPending}>
                    {createWarehouse.isPending ? "Saving..." : "Save Warehouse"}
                  </Button>
                </form>
                <div className="mt-4 pt-4 border-t space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Existing Warehouses</p>
                  {(warehouses || []).map(w => (
                    <div key={w.id} className="flex items-center justify-between text-sm py-1">
                      <span className="font-medium">{w.name}</span>
                      <span className="text-xs text-muted-foreground">{w.location}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Add Room */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Add Room</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={e => {
                  e.preventDefault();
                  createRoom.mutate({
                    warehouseId: Number(roomWhId), name: roomName, potatoType: roomType,
                    capacityKg: Math.round(Number(roomCapTons) * 1000), storageType, isActive: true,
                    maxTempC: maxTemp, maxHumidityPct: maxHumidity, maxCo2Ppm: maxCo2,
                  });
                }} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Warehouse *</Label>
                    <Select value={roomWhId} onValueChange={setRoomWhId}>
                      <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                      <SelectContent>
                        {(warehouses || []).map(w => <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Room Name *</Label>
                      <Input required value={roomName} onChange={e => setRoomName(e.target.value)} placeholder="e.g. F8" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Capacity (tons) *</Label>
                      <Input type="number" required min="1" value={roomCapTons} onChange={e => setRoomCapTons(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Max Temp (°C)</Label>
                      <Input type="number" step="0.1" value={maxTemp} onChange={e => setMaxTemp(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Max Humidity (%)</Label>
                      <Input type="number" step="0.1" value={maxHumidity} onChange={e => setMaxHumidity(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Max CO₂ (ppm)</Label>
                      <Input type="number" value={maxCo2} onChange={e => setMaxCo2(e.target.value)} />
                    </div>
                  </div>
                  <Button type="submit" size="sm" className="w-full" disabled={createRoom.isPending || !roomWhId}>
                    {createRoom.isPending ? "Saving..." : "Save Room"}
                  </Button>
                </form>
                <div className="mt-4 pt-4 border-t space-y-1.5 max-h-32 overflow-y-auto">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Existing Rooms</p>
                  {(rooms || []).map(r => (
                    <div key={r.id} className="flex items-center justify-between text-sm py-0.5">
                      <span className="font-medium">{r.name}</span>
                      <span className="text-xs text-muted-foreground">{(r.capacityKg / 1000).toFixed(1)}t</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="suppliers" className="mt-5 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Add Supplier */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Add Supplier</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={e => { e.preventDefault(); createSupplier.mutate({ name: supName, contactInfo: supContact || null }); }} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Name *</Label>
                    <Input required value={supName} onChange={e => setSupName(e.target.value)} placeholder="e.g. Baraka Farms Co." />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Contact Info</Label>
                    <Input value={supContact} onChange={e => setSupContact(e.target.value)} placeholder="e.g. email or phone" />
                  </div>
                  <Button type="submit" size="sm" className="w-full" disabled={createSupplier.isPending}>
                    {createSupplier.isPending ? "Saving..." : "Save Supplier"}
                  </Button>
                </form>
                <div className="mt-4 pt-4 border-t space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Existing Suppliers</p>
                  {(suppliers || []).map(s => (
                    <div key={s.id} className="flex items-center justify-between text-sm py-0.5">
                      <span className="font-medium">{s.name}</span>
                      <span className="text-xs text-muted-foreground">{s.contactInfo || "—"}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Add Farm */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Add Farm</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={e => {
                  e.preventDefault();
                  createFarm.mutate({ name: farmName, supplierId: farmSupId ? Number(farmSupId) : null, location: farmLocation || null });
                }} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Farm Name *</Label>
                    <Input required value={farmName} onChange={e => setFarmName(e.target.value)} placeholder="e.g. Dab3a Farm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Linked Supplier</Label>
                    <Select value={farmSupId} onValueChange={setFarmSupId}>
                      <SelectTrigger><SelectValue placeholder="Select supplier (optional)" /></SelectTrigger>
                      <SelectContent>
                        {(suppliers || []).map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Location</Label>
                    <Input value={farmLocation} onChange={e => setFarmLocation(e.target.value)} placeholder="e.g. Sharqia Governorate" />
                  </div>
                  <Button type="submit" size="sm" className="w-full" disabled={createFarm.isPending}>
                    {createFarm.isPending ? "Saving..." : "Save Farm"}
                  </Button>
                </form>
                <div className="mt-4 pt-4 border-t space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Existing Farms</p>
                  {(farms || []).map(f => (
                    <div key={f.id} className="flex items-center justify-between text-sm py-0.5">
                      <span className="font-medium">{f.name}</span>
                      <span className="text-xs text-muted-foreground">{f.location || "—"}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
