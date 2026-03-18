import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, AlertTriangle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { LossResponse, BatchResponse } from "@shared/schema";

const LOSS_TYPE_STYLES: Record<string, string> = {
  "Rot": "border-rose-300 text-rose-700 bg-rose-50 dark:bg-rose-950/30",
  "Damage": "border-orange-300 text-orange-700 bg-orange-50 dark:bg-orange-950/30",
  "Shrinkage": "border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/30",
};

export default function Losses() {
  const { data: losses, isLoading } = useQuery<LossResponse[]>({ queryKey: ["/api/losses"] });
  const { data: batches } = useQuery<BatchResponse[]>({ queryKey: ["/api/batches"] });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const [form, setForm] = useState({
    batchId: "",
    lossType: "Rot",
    quantityTons: "",
    notes: "",
    recordedDate: format(new Date(), "yyyy-MM-dd"),
  });

  const activeBatches = (batches || []).filter(b => b.status === "Stored" || b.status === "Partial");
  const selectedBatch = activeBatches.find(b => b.lotNumber === form.batchId);

  const createLoss = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/losses", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/losses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/batches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsOpen(false);
      setForm({ ...form, batchId: "", quantityTons: "", notes: "" });
      toast({ title: "Loss recorded", description: "Inventory has been adjusted." });
    },
    onError: () => toast({ title: "Error", description: "Failed to record loss.", variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createLoss.mutate({
      batchId: form.batchId,
      lossType: form.lossType,
      quantityKg: Math.round(Number(form.quantityTons) * 1000),
      notes: form.notes || null,
      recordedDate: new Date(form.recordedDate),
    });
  };

  const totalLossKg = (losses || []).reduce((s, l) => s + l.quantityKg, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Losses & Shrinkage</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Record and track inventory spoilage and damage</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" className="gap-2" data-testid="button-record-loss">
              <Plus className="w-4 h-4" /> Record Loss
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" /> Record Inventory Loss
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Lot Number *</Label>
                <Select value={form.batchId} onValueChange={v => setForm({ ...form, batchId: v })}>
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
                    Current stock: <strong>{(selectedBatch.currentQuantityKg / 1000).toFixed(1)}t</strong>
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Loss Type *</Label>
                  <Select value={form.lossType} onValueChange={v => setForm({ ...form, lossType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Rot">Rot</SelectItem>
                      <SelectItem value="Damage">Damage</SelectItem>
                      <SelectItem value="Shrinkage">Shrinkage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Quantity (tons) *</Label>
                  <Input
                    type="number" required min="0.001" step="0.001"
                    value={form.quantityTons}
                    onChange={e => setForm({ ...form, quantityTons: e.target.value })}
                    placeholder="e.g. 1.5"
                    data-testid="input-loss-quantity"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Date Recorded *</Label>
                <Input type="date" required value={form.recordedDate} onChange={e => setForm({ ...form, recordedDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Additional details..." className="resize-none" rows={3} />
              </div>
              <div className="flex justify-end">
                <Button type="submit" variant="destructive" disabled={createLoss.isPending} data-testid="button-save-loss">
                  {createLoss.isPending ? "Recording..." : "Record Loss"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Records", value: (losses || []).length },
          { label: "Total Loss", value: `${Math.round(totalLossKg / 1000).toFixed(1)}t` },
          { label: "Rot Events", value: (losses || []).filter(l => l.lossType === "Rot").length },
          { label: "Shrinkage Events", value: (losses || []).filter(l => l.lossType === "Shrinkage").length },
        ].map((s, i) => (
          <Card key={i} className="border shadow-sm p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-xl font-bold mt-0.5 tabular-nums">{s.value}</p>
          </Card>
        ))}
      </div>

      <Card className="border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (losses || []).length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-muted-foreground">
            <AlertTriangle className="w-14 h-14 mb-4 opacity-15" />
            <h3 className="text-base font-semibold text-foreground">No losses recorded</h3>
            <p className="mt-1.5 text-sm text-center">Great news — all inventory appears healthy.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold">Date</TableHead>
                  <TableHead className="text-xs font-semibold">Lot Number</TableHead>
                  <TableHead className="text-xs font-semibold">Type</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Quantity Lost</TableHead>
                  <TableHead className="text-xs font-semibold">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(losses || []).map(l => (
                  <TableRow key={l.id} className="hover:bg-muted/20 text-sm" data-testid={`row-loss-${l.id}`}>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(l.recordedDate), "yyyy-MM-dd")}</TableCell>
                    <TableCell className="font-mono text-xs text-primary font-medium">{l.batchId}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${LOSS_TYPE_STYLES[l.lossType] || ""}`}>
                        {l.lossType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-destructive">
                      -{(l.quantityKg / 1000).toFixed(1)}t
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{l.notes || "—"}</TableCell>
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
