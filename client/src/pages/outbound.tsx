import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, ArrowUpRightSquare } from "lucide-react";
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
import type { ShipmentResponse, BatchResponse } from "@shared/schema";

export default function Outbound() {
  const { data: shipments, isLoading } = useQuery<ShipmentResponse[]>({ queryKey: ["/api/shipments"] });
  const { data: batches } = useQuery<BatchResponse[]>({ queryKey: ["/api/batches"] });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const [form, setForm] = useState({
    batchId: "",
    quantityTons: "",
    destination: "",
    shipmentType: "Full",
    shippedDate: format(new Date(), "yyyy-MM-dd"),
  });

  const activeBatches = (batches || []).filter(b => b.status === "Stored" || b.status === "Partial");
  const selectedBatch = activeBatches.find(b => b.lotNumber === form.batchId);

  const createShipment = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/shipments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shipments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/batches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsOpen(false);
      setForm({ ...form, batchId: "", quantityTons: "", destination: "" });
      toast({ title: "Shipment recorded", description: "Inventory has been updated." });
    },
    onError: () => toast({ title: "Error", description: "Failed to record shipment.", variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createShipment.mutate({
      batchId: form.batchId,
      quantityKg: Math.round(Number(form.quantityTons) * 1000),
      destination: form.destination,
      shipmentType: form.shipmentType,
      shippedDate: new Date(form.shippedDate),
    });
  };

  // Summary stats
  const totalShipped = (shipments || []).reduce((s, sh) => s + sh.quantityKg, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Outbound Shipments</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track batch dispatches and deliveries</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-new-shipment">
              <Plus className="w-4 h-4" /> New Shipment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Record Shipment</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Lot Number (Batch) *</Label>
                <Select value={form.batchId} onValueChange={v => setForm({ ...form, batchId: v, quantityTons: "" })}>
                  <SelectTrigger><SelectValue placeholder="Select active batch" /></SelectTrigger>
                  <SelectContent>
                    {activeBatches.map(b => (
                      <SelectItem key={b.lotNumber} value={b.lotNumber}>
                        {b.lotNumber} · {(b.currentQuantityKg / 1000).toFixed(1)}t available
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedBatch && (
                  <p className="text-xs text-muted-foreground">
                    Available: <strong>{(selectedBatch.currentQuantityKg / 1000).toFixed(1)} tons</strong>
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Quantity (tons) *</Label>
                  <Input
                    type="number" required min="0.001" step="0.001"
                    max={selectedBatch ? selectedBatch.currentQuantityKg / 1000 : undefined}
                    value={form.quantityTons}
                    onChange={e => setForm({ ...form, quantityTons: e.target.value })}
                    placeholder="e.g. 10.5"
                    data-testid="input-shipment-quantity"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={form.shipmentType} onValueChange={v => setForm({ ...form, shipmentType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Full">Full</SelectItem>
                      <SelectItem value="Partial">Partial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Destination *</Label>
                <Input required value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} placeholder="e.g. Cairo Market" data-testid="input-destination" />
              </div>
              <div className="space-y-1.5">
                <Label>Shipped Date *</Label>
                <Input type="date" required value={form.shippedDate} onChange={e => setForm({ ...form, shippedDate: e.target.value })} />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={createShipment.isPending} data-testid="button-save-shipment">
                  {createShipment.isPending ? "Saving..." : "Record Shipment"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="border shadow-sm p-4">
          <p className="text-xs text-muted-foreground">Total Shipments</p>
          <p className="text-xl font-bold mt-0.5">{(shipments || []).length}</p>
        </Card>
        <Card className="border shadow-sm p-4">
          <p className="text-xs text-muted-foreground">Total Shipped</p>
          <p className="text-xl font-bold mt-0.5 tabular-nums">{Math.round(totalShipped / 1000).toLocaleString()}t</p>
        </Card>
        <Card className="border shadow-sm p-4">
          <p className="text-xs text-muted-foreground">Today's Shipments</p>
          <p className="text-xl font-bold mt-0.5">
            {(shipments || []).filter(s => new Date(s.shippedDate).toDateString() === new Date().toDateString()).length}
          </p>
        </Card>
      </div>

      <Card className="border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (shipments || []).length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-muted-foreground">
            <ArrowUpRightSquare className="w-14 h-14 mb-4 opacity-15" />
            <h3 className="text-base font-semibold text-foreground">No shipments yet</h3>
            <p className="mt-1.5 text-sm text-center">Record your first outbound shipment to track deliveries.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold">Shipment #</TableHead>
                  <TableHead className="text-xs font-semibold">Lot Number</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Quantity</TableHead>
                  <TableHead className="text-xs font-semibold">Destination</TableHead>
                  <TableHead className="text-xs font-semibold">Date</TableHead>
                  <TableHead className="text-xs font-semibold">Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(shipments || []).map(s => (
                  <TableRow key={s.id} className="hover:bg-muted/20 text-sm" data-testid={`row-shipment-${s.id}`}>
                    <TableCell className="font-mono text-xs font-medium text-muted-foreground">{s.shipmentNumber || `SHP-${s.id}`}</TableCell>
                    <TableCell className="font-mono text-xs text-primary font-medium">{s.batchId}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{(s.quantityKg / 1000).toFixed(1)}t</TableCell>
                    <TableCell>{s.destination}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(s.shippedDate), "yyyy-MM-dd")}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${s.shipmentType === "Full" ? "border-blue-200 text-blue-700 bg-blue-50 dark:bg-blue-950/30" : "border-amber-200 text-amber-700 bg-amber-50"}`}>
                        {s.shipmentType || "Full"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
