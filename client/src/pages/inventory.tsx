import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, differenceInDays } from "date-fns";
import { PackageSearch, Boxes, Search, Pencil } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { BatchResponse, WarehouseResponse, RoomResponse, TruckResponse } from "@shared/schema";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    "Stored": "border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400",
    "Partial": "border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/30",
    "Depleted": "border-slate-300 text-slate-600 bg-slate-50",
    "Expired": "border-rose-300 text-rose-700 bg-rose-50 dark:bg-rose-950/30",
  };
  return <Badge variant="outline" className={`text-xs ${styles[status] || ""}`}>{status}</Badge>;
}

function AgeBadge({ days }: { days: number }) {
  const className = days <= 30
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
    : days <= 60
    ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
    : "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400";
  return <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${className}`}>{days}d</span>;
}

export default function Inventory() {
  const { data: batches, isLoading } = useQuery<BatchResponse[]>({ queryKey: ["/api/batches"] });
  const { data: warehouses } = useQuery<WarehouseResponse[]>({ queryKey: ["/api/warehouses"] });
  const { data: rooms } = useQuery<RoomResponse[]>({ queryKey: ["/api/rooms"] });
  const { data: trucks } = useQuery<TruckResponse[]>({ queryKey: ["/api/trucks"] });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [editBatch, setEditBatch] = useState<BatchResponse | null>(null);
  const [editForm, setEditForm] = useState({
    warehouseId: "",
    roomId: "",
    expirationDate: "",
    status: "",
    acceptanceStatus: "",
  });

  const warehouseMap = Object.fromEntries((warehouses || []).map(w => [w.id, w]));
  const roomMap = Object.fromEntries((rooms || []).map(r => [r.id, r]));
  const truckMap = Object.fromEntries((trucks || []).map(t => [t.id, t]));

  const now = new Date();

  const filtered = (batches || []).filter(b => {
    const truck = b.truckId ? truckMap[b.truckId] : null;
    const query = search.toLowerCase();
    const matchSearch = !query ||
      b.lotNumber.toLowerCase().includes(query) ||
      (truck && truck.variety.toLowerCase().includes(query)) ||
      (truck && truck.productType.toLowerCase().includes(query)) ||
      (warehouseMap[b.warehouseId]?.name.toLowerCase().includes(query));
    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    const matchWarehouse = warehouseFilter === "all" || String(b.warehouseId) === warehouseFilter;
    return matchSearch && matchStatus && matchWarehouse;
  });

  const activeBatches = (batches || []).filter(b => b.status === "Stored" || b.status === "Partial");
  const totalKg = activeBatches.reduce((s, b) => s + b.currentQuantityKg, 0);

  const openEdit = (batch: BatchResponse) => {
    setEditBatch(batch);
    setEditForm({
      warehouseId: String(batch.warehouseId),
      roomId: String(batch.roomId),
      expirationDate: format(new Date(batch.expirationDate), "yyyy-MM-dd"),
      status: batch.status,
      acceptanceStatus: batch.acceptanceStatus,
    });
  };

  const filteredEditRooms = (rooms || []).filter(r => !editForm.warehouseId || r.warehouseId === Number(editForm.warehouseId));

  const updateBatch = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", `/api/batches/${editBatch!.lotNumber}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/batches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/warehouse-utilization"] });
      setEditBatch(null);
      toast({ title: "Batch updated" });
    },
    onError: () => toast({ title: "Error", description: "Failed to update batch.", variant: "destructive" }),
  });

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateBatch.mutate({
      warehouseId: Number(editForm.warehouseId),
      roomId: Number(editForm.roomId),
      expirationDate: new Date(editForm.expirationDate),
      status: editForm.status,
      acceptanceStatus: editForm.acceptanceStatus,
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Track lots, quantities, and expiration dates</p>
      </div>

      {/* Mini summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Active Lots", value: activeBatches.length },
          { label: "Total Stock", value: `${Math.round(totalKg / 1000).toLocaleString()}t` },
          { label: "Expiring 30d", value: activeBatches.filter(b => differenceInDays(new Date(b.expirationDate), now) <= 30).length },
          { label: "Depleted", value: (batches || []).filter(b => b.status === "Depleted").length },
        ].map((s, i) => (
          <Card key={i} className="border shadow-sm p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-xl font-bold mt-0.5 tabular-nums">{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by lot number, variety..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" data-testid="input-inventory-search" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Stored">Stored</SelectItem>
            <SelectItem value="Partial">Partial</SelectItem>
            <SelectItem value="Depleted">Depleted</SelectItem>
            <SelectItem value="Expired">Expired</SelectItem>
          </SelectContent>
        </Select>
        <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Warehouse" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Warehouses</SelectItem>
            {(warehouses || []).map(w => <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-muted-foreground">
            <Boxes className="w-14 h-14 mb-4 opacity-15" />
            <h3 className="text-base font-semibold text-foreground">No batches found</h3>
            <p className="mt-1.5 text-sm text-center">Batches are generated automatically when inbound trucks are received.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold">Lot Number</TableHead>
                  <TableHead className="text-xs font-semibold">Product</TableHead>
                  <TableHead className="text-xs font-semibold">Location</TableHead>
                  <TableHead className="text-xs font-semibold">Received</TableHead>
                  <TableHead className="text-xs font-semibold">Expires</TableHead>
                  <TableHead className="text-xs font-semibold">Age</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Initial</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Current</TableHead>
                  <TableHead className="text-xs font-semibold">Remaining</TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-xs font-semibold"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((batch) => {
                  const truck = batch.truckId ? truckMap[batch.truckId] : null;
                  const wh = warehouseMap[batch.warehouseId];
                  const room = roomMap[batch.roomId];
                  const days = differenceInDays(now, new Date(batch.receivedDate));
                  const pct = batch.initialQuantityKg > 0 ? Math.round((batch.currentQuantityKg / batch.initialQuantityKg) * 100) : 0;
                  const daysToExpiry = differenceInDays(new Date(batch.expirationDate), now);
                  const expiryClass = daysToExpiry <= 7 ? "text-destructive font-medium" : daysToExpiry <= 30 ? "text-amber-600" : "text-muted-foreground";

                  return (
                    <TableRow key={batch.lotNumber} className="hover:bg-muted/20 text-sm" data-testid={`row-batch-${batch.lotNumber}`}>
                      <TableCell className="font-mono text-xs text-primary font-medium">{batch.lotNumber}</TableCell>
                      <TableCell>
                        {truck ? (
                          <div>
                            <p className="font-medium">{truck.productType}</p>
                            <p className="text-xs text-muted-foreground capitalize">{truck.variety}</p>
                          </div>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium capitalize">{wh?.name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{room?.name || "—"}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(batch.receivedDate), "MMM dd, yyyy")}</TableCell>
                      <TableCell className={`text-xs ${expiryClass}`}>{format(new Date(batch.expirationDate), "MMM dd, yyyy")}</TableCell>
                      <TableCell><AgeBadge days={days} /></TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{(batch.initialQuantityKg / 1000).toFixed(1)}t</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">{(batch.currentQuantityKg / 1000).toFixed(1)}t</TableCell>
                      <TableCell className="w-28">
                        <div className="flex items-center gap-2">
                          <Progress value={pct} className="h-1.5 flex-1" />
                          <span className="text-xs tabular-nums w-8 text-right">{pct}%</span>
                        </div>
                      </TableCell>
                      <TableCell><StatusBadge status={batch.status} /></TableCell>
                      <TableCell>
                        <Button
                          size="sm" variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => openEdit(batch)}
                          data-testid={`button-edit-batch-${batch.lotNumber}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Edit Batch Dialog */}
      <Dialog open={!!editBatch} onOpenChange={open => { if (!open) setEditBatch(null); }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Edit Batch — {editBatch?.lotNumber}</DialogTitle>
          </DialogHeader>
          {editBatch && (
            <form onSubmit={handleEditSubmit} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Warehouse</Label>
                  <Select value={editForm.warehouseId} onValueChange={v => setEditForm({ ...editForm, warehouseId: v, roomId: "" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(warehouses || []).map(w => <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Room</Label>
                  <Select value={editForm.roomId} onValueChange={v => setEditForm({ ...editForm, roomId: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {filteredEditRooms.map(r => <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Expiration Date</Label>
                  <Input type="date" value={editForm.expirationDate} onChange={e => setEditForm({ ...editForm, expirationDate: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={editForm.status} onValueChange={v => setEditForm({ ...editForm, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Stored">Stored</SelectItem>
                      <SelectItem value="Partial">Partial</SelectItem>
                      <SelectItem value="Depleted">Depleted</SelectItem>
                      <SelectItem value="Expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Acceptance Status</Label>
                  <Select value={editForm.acceptanceStatus} onValueChange={v => setEditForm({ ...editForm, acceptanceStatus: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Accepted">Accepted</SelectItem>
                      <SelectItem value="Partial Reject">Partial Reject</SelectItem>
                      <SelectItem value="Rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditBatch(null)}>Cancel</Button>
                <Button type="submit" disabled={updateBatch.isPending} data-testid="button-save-batch-edit">
                  {updateBatch.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
