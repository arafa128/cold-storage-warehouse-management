import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Plus } from "lucide-react";
import type { SupplierResponse, SupplierRemainingQuota } from "@shared/schema";

export default function Suppliers() {
  const { toast } = useToast();
  const { data: suppliers, isLoading } = useQuery<SupplierResponse[]>({ queryKey: ["/api/suppliers"] });
  const { data: quotas } = useQuery<SupplierRemainingQuota[]>({ queryKey: ["/api/suppliers/remaining-quotas"] });
  const [editSupplier, setEditSupplier] = useState<SupplierResponse | null>(null);
  const [editName, setEditName] = useState("");
  const [editContact, setEditContact] = useState("");
  const [editMaxQty, setEditMaxQty] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addContact, setAddContact] = useState("");
  const [addMaxQty, setAddMaxQty] = useState("");

  const updateMutation = useMutation({
    mutationFn: (data: { id: number; name: string; contactInfo: string | null; maxAcceptedQuantityKg: number | null }) =>
      apiRequest("PATCH", `/api/suppliers/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers/remaining-quotas"] });
      setEditSupplier(null);
      toast({ title: "Supplier updated" });
    },
    onError: () => toast({ title: "Error", description: "Failed to update supplier.", variant: "destructive" }),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; contactInfo: string | null; maxAcceptedQuantityKg: number | null }) =>
      apiRequest("POST", "/api/suppliers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers/remaining-quotas"] });
      setAddOpen(false);
      setAddName("");
      setAddContact("");
      setAddMaxQty("");
      toast({ title: "Supplier added" });
    },
    onError: () => toast({ title: "Error", description: "Failed to add supplier.", variant: "destructive" }),
  });

  const openEdit = (s: SupplierResponse) => {
    setEditSupplier(s);
    setEditName(s.name);
    setEditContact(s.contactInfo || "");
    setEditMaxQty(s.maxAcceptedQuantityKg ? String(s.maxAcceptedQuantityKg / 1000) : "");
  };

  const handleSave = () => {
    if (!editSupplier) return;
    updateMutation.mutate({
      id: editSupplier.id,
      name: editName,
      contactInfo: editContact || null,
      maxAcceptedQuantityKg: editMaxQty ? Number(editMaxQty) * 1000 : null,
    });
  };

  const handleAdd = () => {
    if (!addName.trim()) return;
    createMutation.mutate({
      name: addName.trim(),
      contactInfo: addContact.trim() || null,
      maxAcceptedQuantityKg: addMaxQty ? Number(addMaxQty) * 1000 : null,
    });
  };

  const getQuotaForSupplier = (id: number) => quotas?.find(q => q.supplierId === id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-suppliers-title">Suppliers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage suppliers and their accepted quantity quotas</p>
        </div>
        <Button onClick={() => setAddOpen(true)} size="sm" data-testid="button-add-supplier">
          <Plus className="w-4 h-4 mr-1" /> Add Supplier
        </Button>
      </div>

      <Card className="border shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-right">Max Quota (t)</TableHead>
                <TableHead className="text-right">Received (t)</TableHead>
                <TableHead className="text-right">Remaining (t)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(suppliers || []).map(s => {
                const quota = getQuotaForSupplier(s.id);
                const maxTons = s.maxAcceptedQuantityKg ? s.maxAcceptedQuantityKg / 1000 : null;
                const receivedTons = quota ? Math.round(quota.totalReceivedKg / 1000) : 0;
                const remainingTons = quota ? Math.round(quota.remainingKg / 1000) : null;

                return (
                  <TableRow key={s.id} data-testid={`row-supplier-${s.id}`}>
                    <TableCell className="font-medium" data-testid={`text-supplier-name-${s.id}`}>{s.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{s.contactInfo || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {maxTons != null ? `${maxTons}` : <Badge variant="outline" className="text-xs">No limit</Badge>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{receivedTons}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {remainingTons != null ? (
                        <span className={remainingTons <= 500 ? "text-orange-500 font-medium" : "text-emerald-500 font-medium"}>
                          {remainingTons}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(s)}
                        data-testid={`button-edit-supplier-${s.id}`}
                      >
                        <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!suppliers || suppliers.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    No suppliers found. Add one to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editSupplier} onOpenChange={(open) => !open && setEditSupplier(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Supplier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Name</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} data-testid="input-edit-supplier-name" />
            </div>
            <div>
              <Label>Contact Info</Label>
              <Input value={editContact} onChange={e => setEditContact(e.target.value)} data-testid="input-edit-supplier-contact" />
            </div>
            <div>
              <Label>Max Accepted Quantity (tons)</Label>
              <Input type="number" step="0.1" min="0" value={editMaxQty} onChange={e => setEditMaxQty(e.target.value)} placeholder="Leave empty for no limit" data-testid="input-edit-supplier-max-qty" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSupplier(null)} data-testid="button-cancel-edit">Cancel</Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending} data-testid="button-save-supplier">
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Supplier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Name</Label>
              <Input value={addName} onChange={e => setAddName(e.target.value)} data-testid="input-add-supplier-name" />
            </div>
            <div>
              <Label>Contact Info</Label>
              <Input value={addContact} onChange={e => setAddContact(e.target.value)} data-testid="input-add-supplier-contact" />
            </div>
            <div>
              <Label>Max Accepted Quantity (tons)</Label>
              <Input type="number" step="0.1" min="0" value={addMaxQty} onChange={e => setAddMaxQty(e.target.value)} placeholder="Leave empty for no limit" data-testid="input-add-supplier-max-qty" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} data-testid="button-cancel-add">Cancel</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending || !addName.trim()} data-testid="button-save-new-supplier">
              {createMutation.isPending ? "Saving..." : "Add Supplier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
