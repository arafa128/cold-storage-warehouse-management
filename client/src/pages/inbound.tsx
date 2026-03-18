import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSuppliers } from "@/hooks/use-suppliers";
import { useFarms } from "@/hooks/use-farms";
import { useWarehouses } from "@/hooks/use-warehouses";
import { useRooms } from "@/hooks/use-rooms";
import { format } from "date-fns";
import { Plus, Truck as TruckIcon, Search, Scale } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { TruckResponse, BatchResponse } from "@shared/schema";

function AcceptanceBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    "Accepted": "border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400",
    "Rejected": "border-rose-300 text-rose-700 bg-rose-50 dark:bg-rose-950/30 dark:text-rose-400",
    "Partial Reject": "border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400",
  };
  return <Badge variant="outline" className={`text-xs ${styles[status] || ""}`}>{status}</Badge>;
}

function StoredBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    "Stored": "border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400",
    "Partial": "border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/30",
    "Depleted": "border-slate-300 text-slate-600 bg-slate-50 dark:bg-slate-950/30",
    "Expired": "border-rose-300 text-rose-700 bg-rose-50 dark:bg-rose-950/30",
    "Rejected": "border-red-300 text-red-700 bg-red-50 dark:bg-red-950/30",
  };
  return <Badge variant="outline" className={`text-xs ${styles[status] || ""}`}>{status}</Badge>;
}

export default function Inbound() {
  const { data: trucks, isLoading } = useQuery<TruckResponse[]>({ queryKey: ["/api/trucks"] });
  const { data: batches } = useQuery<BatchResponse[]>({ queryKey: ["/api/batches"] });
  const { data: suppliers } = useSuppliers();
  const { data: farms } = useFarms();
  const { data: warehouses } = useWarehouses();
  const { data: rooms } = useRooms();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [secondWeightTruck, setSecondWeightTruck] = useState<TruckResponse | null>(null);
  const [secondWeightValue, setSecondWeightValue] = useState("");
  const [secondWeightAcceptance, setSecondWeightAcceptance] = useState("Accepted");

  const [form, setForm] = useState({
    truckNumber: "",
    supplierId: "",
    farmId: "",
    productType: "Potato",
    variety: "",
    jamboBags: "",
    firstWeightKg: "",
    warehouseId: "",
    roomId: "",
    arrivalDate: format(new Date(), "yyyy-MM-dd"),
  });

  const netWeight = form.firstWeightKg ? Number(form.firstWeightKg) : 0;

  const createTruck = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/trucks", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trucks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/batches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/weekly-flow"] });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers/remaining-quotas"] });
      setIsOpen(false);
      setForm(f => ({ ...f, truckNumber: "", firstWeightKg: "", variety: "", jamboBags: "" }));
      toast({ title: "Truck received", description: "Batch has been generated automatically." });
    },
    onError: () => toast({ title: "Error", description: "Failed to save truck arrival.", variant: "destructive" }),
  });

  const recordSecondWeight = useMutation({
    mutationFn: (data: { id: number; secondWeightKg: string; acceptanceStatus: string }) =>
      apiRequest("PATCH", `/api/trucks/${data.id}/second-weight`, { 
        secondWeightKg: Number(data.secondWeightKg),
        acceptanceStatus: data.acceptanceStatus 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trucks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/batches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers/remaining-quotas"] });
      setSecondWeightTruck(null);
      setSecondWeightValue("");
      setSecondWeightAcceptance("Accepted");
      toast({ title: "2nd weight recorded", description: "Net weight and batch updated." });
    },
    onError: () => toast({ title: "Error", description: "Failed to record 2nd weight.", variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTruck.mutate({
      ...form,
      firstWeightKg: Number(form.firstWeightKg) * 1000,
      secondWeightKg: null,
      antiSproutType: null,
      jamboBags: form.jamboBags ? Number(form.jamboBags) : null,
      warehouseId: form.warehouseId ? Number(form.warehouseId) : null,
      roomId: form.roomId ? Number(form.roomId) : null,
      supplierId: form.supplierId ? Number(form.supplierId) : null,
      farmId: form.farmId ? Number(form.farmId) : null,
      expirationDate: null,
      acceptanceStatus: "Accepted",
    });
  };

  const batchByTruck = Object.fromEntries((batches || []).map(b => [b.truckId, b]));
  const supplierMap = Object.fromEntries((suppliers || []).map(s => [s.id, s.name]));
  const farmMap = Object.fromEntries((farms || []).map(f => [f.id, f.name]));
  const warehouseMap = Object.fromEntries((warehouses || []).map(w => [w.id, w.name]));
  const roomMap = Object.fromEntries((rooms || []).map(r => [r.id, r.name]));

  const filteredTrucks = (trucks || []).filter(t => {
    const batch = batchByTruck[t.id];
    const query = search.toLowerCase();
    return !query
      || t.truckNumber.toLowerCase().includes(query)
      || (t.supplierId && supplierMap[t.supplierId]?.toLowerCase().includes(query))
      || (t.farmId && farmMap[t.farmId]?.toLowerCase().includes(query))
      || t.variety.toLowerCase().includes(query)
      || (batch && batch.lotNumber.toLowerCase().includes(query));
  });

  const filteredRooms = (rooms || []).filter(r => !form.warehouseId || r.warehouseId === Number(form.warehouseId));

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inbound Operations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Truck arrivals and batch registration</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-record-arrival">
              <Plus className="w-4 h-4" /> Record Arrival
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Record Truck Arrival</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Truck Number *</Label>
                  <Input required value={form.truckNumber} onChange={e => setForm({ ...form, truckNumber: e.target.value })} placeholder="e.g. TRK-001" data-testid="input-truck-number" />
                </div>
                <div className="space-y-1.5">
                  <Label>Arrival Date *</Label>
                  <Input type="date" required value={form.arrivalDate} onChange={e => setForm({ ...form, arrivalDate: e.target.value })} data-testid="input-arrival-date" />
                </div>
                <div className="space-y-1.5">
                  <Label>Supplier</Label>
                  <Select value={form.supplierId} onValueChange={v => setForm({ ...form, supplierId: v, farmId: "" })}>
                    <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                    <SelectContent>
                      {suppliers?.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Farm</Label>
                  <Select value={form.farmId} onValueChange={v => setForm({ ...form, farmId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select farm" /></SelectTrigger>
                    <SelectContent>
                      {farms?.map(f => <SelectItem key={f.id} value={f.id.toString()}>{f.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Product Type *</Label>
                  <Select value={form.productType} onValueChange={v => setForm({ ...form, productType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Potato">Potato</SelectItem>
                      <SelectItem value="Corn">Corn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Variety *</Label>
                  <Input required value={form.variety} onChange={e => setForm({ ...form, variety: e.target.value })} placeholder="e.g. Russet, Rozet" data-testid="input-variety" />
                </div>
                <div className="space-y-1.5">
                  <Label>Jambo Bags (count)</Label>
                  <Input type="number" min="0" step="1" value={form.jamboBags} onChange={e => setForm({ ...form, jamboBags: e.target.value })} placeholder="e.g. 120" data-testid="input-jambo-bags" />
                </div>
              </div>

              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Weighing</p>
                <div className="space-y-1.5">
                  <Label>1st Weight (tons) * — Gross</Label>
                  <Input type="number" required min="0" step="0.01" value={form.firstWeightKg} onChange={e => setForm({ ...form, firstWeightKg: e.target.value })} placeholder="full truck weight" data-testid="input-first-weight" />
                  {form.firstWeightKg && (
                    <p className="text-xs text-muted-foreground pt-1">
                      Net (before 2nd weight): <strong className="text-foreground">{netWeight.toFixed(2)} tons</strong>
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Storage Assignment</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Warehouse</Label>
                    <Select value={form.warehouseId} onValueChange={v => setForm({ ...form, warehouseId: v, roomId: "" })}>
                      <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                      <SelectContent>
                        {warehouses?.map(w => <SelectItem key={w.id} value={w.id.toString()}>{w.name} – {w.location}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Room</Label>
                    <Select value={form.roomId} onValueChange={v => setForm({ ...form, roomId: v })} disabled={!form.warehouseId}>
                      <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                      <SelectContent>
                        {filteredRooms?.map(r => <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={createTruck.isPending} data-testid="button-save-truck">
                  {createTruck.isPending ? "Saving..." : "Save & Generate Lot"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Second Weight Dialog */}
      <Dialog open={!!secondWeightTruck} onOpenChange={open => { if (!open) { setSecondWeightTruck(null); setSecondWeightValue(""); setSecondWeightAcceptance("Accepted"); } }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="w-4 h-4" /> Record 2nd Weight & Acceptance
            </DialogTitle>
          </DialogHeader>
          {secondWeightTruck && (
            <div className="space-y-4 mt-2">
              <div className="p-3 rounded-lg bg-muted/40 text-sm space-y-1">
                <p><span className="text-muted-foreground">Truck:</span> <strong>{secondWeightTruck.truckNumber}</strong></p>
                <p><span className="text-muted-foreground">1st Weight:</span> <strong>{(secondWeightTruck.firstWeightKg / 1000).toFixed(2)}t</strong></p>
              </div>
              <div className="space-y-1.5">
                <Label>Tare Weight (tons) *</Label>
                <Input
                  type="number" min="0" step="0.01" autoFocus
                  value={secondWeightValue}
                  onChange={e => setSecondWeightValue(e.target.value)}
                  placeholder="empty truck weight"
                  data-testid="input-second-weight-record"
                />
                {secondWeightValue && (
                  <p className="text-xs text-muted-foreground pt-1">
                    Net: <strong className="text-foreground">{(Math.abs(secondWeightTruck.firstWeightKg - Number(secondWeightValue) * 1000) / 1000).toFixed(2)}t</strong>
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Acceptance Status *</Label>
                <Select value={secondWeightAcceptance} onValueChange={setSecondWeightAcceptance}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Accepted">Accepted</SelectItem>
                    <SelectItem value="Partial Reject">Partial Reject</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setSecondWeightTruck(null); setSecondWeightValue(""); setSecondWeightAcceptance("Accepted"); }}>Cancel</Button>
                <Button
                  disabled={!secondWeightValue || recordSecondWeight.isPending}
                  onClick={() => recordSecondWeight.mutate({ id: secondWeightTruck.id, secondWeightKg: secondWeightValue, acceptanceStatus: secondWeightAcceptance })}
                  data-testid="button-save-second-weight"
                >
                  {recordSecondWeight.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by lot, truck, supplier, variety..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
      </div>

      <Card className="border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : filteredTrucks.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-muted-foreground">
            <TruckIcon className="w-14 h-14 mb-4 opacity-15" />
            <h3 className="text-base font-semibold text-foreground">No trucks found</h3>
            <p className="mt-1.5 text-sm text-center max-w-xs">Record truck arrivals to start tracking inbound inventory and generating lot numbers.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold">Lot Number</TableHead>
                  <TableHead className="text-xs font-semibold">Truck</TableHead>
                  <TableHead className="text-xs font-semibold">Supplier / Farm</TableHead>
                  <TableHead className="text-xs font-semibold">Product</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Bags</TableHead>
                  <TableHead className="text-xs font-semibold text-right">1st (t)</TableHead>
                  <TableHead className="text-xs font-semibold text-right">2nd (t)</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Net (t)</TableHead>
                  <TableHead className="text-xs font-semibold">Date</TableHead>
                  <TableHead className="text-xs font-semibold">Location</TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-xs font-semibold"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrucks.map((truck) => {
                  const batch = batchByTruck[truck.id];
                  const needsSecondWeight = truck.secondWeightKg == null;
                  return (
                    <TableRow key={truck.id} className="hover:bg-muted/20 text-sm" data-testid={`row-truck-${truck.id}`}>
                      <TableCell className="font-mono text-xs text-primary font-medium">
                        {batch?.lotNumber || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="font-medium">{truck.truckNumber}</TableCell>
                      <TableCell>
                        <div>
                          <p>{truck.supplierId ? supplierMap[truck.supplierId] || "—" : "—"}</p>
                          {truck.farmId && <p className="text-xs text-muted-foreground">{farmMap[truck.farmId] || "—"}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p>{truck.productType}</p>
                          <p className="text-xs text-muted-foreground capitalize">{truck.variety}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs text-muted-foreground">
                        {batch?.jamboBags != null ? batch.jamboBags.toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{(truck.firstWeightKg / 1000).toFixed(0)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {truck.secondWeightKg != null ? (truck.secondWeightKg / 1000).toFixed(0) : (
                          <span className="text-amber-500 text-xs">pending</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">{(truck.totalWeightKg / 1000).toFixed(0)}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{format(new Date(truck.arrivalDate), "yyyy-MM-dd")}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {batch ? (
                          <div>
                            <p>{warehouseMap[batch.warehouseId] || "?"}</p>
                            <p className="text-muted-foreground/60">{roomMap[batch.roomId] || "?"}</p>
                          </div>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {batch && <StoredBadge status={batch.status} />}
                          {batch && <AcceptanceBadge status={batch.acceptanceStatus} />}
                        </div>
                      </TableCell>
                      <TableCell>
                        {needsSecondWeight && (
                          <Button
                            size="sm" variant="outline"
                            className="text-xs h-7 gap-1 border-amber-300 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                            onClick={() => { setSecondWeightTruck(truck); setSecondWeightValue(""); setSecondWeightAcceptance("Accepted"); }}
                            data-testid={`button-second-weight-${truck.id}`}
                          >
                            <Scale className="w-3 h-3" /> 2nd
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
