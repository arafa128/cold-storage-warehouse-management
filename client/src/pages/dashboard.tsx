import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Truck, Scale, ArrowUpRight, AlertTriangle, Snowflake, PackageOpen,
  TrendingUp, Clock, Activity, Thermometer
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { format, formatDistanceToNow } from "date-fns";
import type { DashboardStatsResponse, BatchResponse, TruckResponse, WarehouseUtilizationResponse, SensorAlertResponse, SupplierRemainingQuota } from "@shared/schema";

const COLORS = ["hsl(217,91%,50%)", "hsl(160,60%,45%)", "hsl(30,90%,55%)", "hsl(280,65%,60%)", "hsl(340,75%,55%)", "hsl(200,80%,50%)"];

function StatCard({ title, value, sub, icon: Icon, color, bg }: { title: string; value: string | number; sub?: string; icon: any; color: string; bg: string }) {
  return (
    <Card className="border shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
            <p className="text-2xl font-bold mt-1 tabular-nums">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`p-2.5 rounded-lg shrink-0 ${bg}`}>
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStatsResponse>({
    queryKey: ["/api/dashboard/stats"],
    refetchInterval: 30000,
  });

  const { data: weeklyFlow, isLoading: flowLoading } = useQuery<{ date: string; inbound: number; outbound: number }[]>({
    queryKey: ["/api/dashboard/weekly-flow"],
    refetchInterval: 60000,
  });

  const { data: warehouseUtil } = useQuery<WarehouseUtilizationResponse[]>({
    queryKey: ["/api/dashboard/warehouse-utilization"],
    refetchInterval: 60000,
  });

  const { data: sensorAlerts } = useQuery<SensorAlertResponse[]>({
    queryKey: ["/api/sensors/alerts"],
    refetchInterval: 30000,
  });

  const { data: batches } = useQuery<BatchResponse[]>({
    queryKey: ["/api/batches"],
    refetchInterval: 60000,
  });

  const { data: shipments } = useQuery<any[]>({
    queryKey: ["/api/shipments"],
    refetchInterval: 60000,
  });

  const { data: supplierQuotas } = useQuery<SupplierRemainingQuota[]>({
    queryKey: ["/api/suppliers/remaining-quotas"],
    refetchInterval: 30000,
  });

  // Inventory breakdown by variety
  const varietyBreakdown = (() => {
    if (!batches) return [];
    const activeBatches = batches.filter(b => b.status === "Stored" || b.status === "Partial");
    const map: Record<string, number> = {};
    for (const b of activeBatches) {
      // We don't have variety on batch directly, group by product+status for now
      const key = b.status;
      map[key] = (map[key] || 0) + b.currentQuantityKg;
    }
    return Object.entries(map).map(([name, value]) => ({ name, value: Math.round(value / 1000) }));
  })();

  const lowQuotaSuppliers = (supplierQuotas || []).filter(q => q.remainingKg / 1000 <= 500);

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[...Array(9)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  const kpis = [
    { title: "Trucks Today", value: stats?.trucksReceivedToday ?? 0, icon: Truck, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Tons Received", value: `${stats?.tonsReceivedToday ?? 0}t`, icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { title: "Tons Shipped", value: `${stats?.tonsShippedToday ?? 0}t`, icon: ArrowUpRight, color: "text-violet-500", bg: "bg-violet-500/10" },
    { title: "Active Batches", value: stats?.activeBatches ?? 0, icon: PackageOpen, color: "text-indigo-500", bg: "bg-indigo-500/10" },
    { title: "Total Inventory", value: `${Math.round((stats?.totalCurrentInventoryKg ?? 0) / 1000)}t`, icon: Scale, color: "text-cyan-500", bg: "bg-cyan-500/10" },
    { title: "Capacity", value: `${Math.round(stats?.capacityUtilizationPercent ?? 0)}%`, icon: Snowflake, color: "text-sky-500", bg: "bg-sky-500/10" },
    { title: "Over Threshold", value: stats?.roomsOverThreshold ?? 0, icon: Thermometer, color: "text-orange-500", bg: "bg-orange-500/10" },
    { title: "Expiring 7d", value: stats?.expiringIn7Days ?? 0, icon: Clock, color: "text-rose-500", bg: "bg-rose-500/10" },
    { title: "Loss Today", value: `${Math.round((stats?.lossRecordedTodayKg ?? 0) / 1000)}t`, icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Real-time overview · {format(new Date(), "MMMM d, yyyy")}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {kpis.map((kpi, i) => (
          <StatCard key={i} {...kpi} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Inbound vs Outbound */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Inbound vs Outbound (7 days)</CardTitle>
            <p className="text-xs text-muted-foreground">Daily tonnage flow</p>
          </CardHeader>
          <CardContent className="h-56 -mx-2">
            {flowLoading ? <Skeleton className="h-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyFlow || []} margin={{ top: 0, right: 16, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))", color: "hsl(var(--popover-foreground))", fontSize: 12 }}
                    formatter={(v: number) => [`${v}t`, ""]}
                  />
                  <Bar dataKey="inbound" name="Inbound" fill="hsl(217,91%,60%)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="outbound" name="Outbound" fill="hsl(262,83%,65%)" radius={[3, 3, 0, 0]} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Inventory Breakdown Pie */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Inventory & Supplier Quotas</CardTitle>
            <p className="text-xs text-muted-foreground">Status breakdown & remaining supplier quotas</p>
          </CardHeader>
          <CardContent className="h-56 -mx-2">
            <div className="grid grid-cols-2 gap-2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={varietyBreakdown.length ? varietyBreakdown : [{ name: "No data", value: 1 }]} cx="50%" cy="50%" innerRadius="50%" outerRadius="80%" dataKey="value" paddingAngle={2}>
                    {(varietyBreakdown.length ? varietyBreakdown : [{ name: "No data", value: 1 }]).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v}t`, ""]} contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col justify-center gap-2 overflow-y-auto">
                <p className="text-xs font-semibold text-muted-foreground mb-1" data-testid="text-supplier-quota-title">Supplier Remaining Quota</p>
                {lowQuotaSuppliers.length === 0 ? (
                  <p className="text-xs text-muted-foreground" data-testid="text-all-quotas-ok">All quotas OK</p>
                ) : (
                  lowQuotaSuppliers.map((q) => {
                    const remainingTons = Math.round(q.remainingKg / 1000);
                    const maxTons = Math.round(q.maxAcceptedQuantityKg / 1000);
                    const receivedTons = Math.round(q.totalReceivedKg / 1000);
                    const usagePct = maxTons > 0 ? Math.round(((maxTons - remainingTons) / maxTons) * 100) : 0;
                    return (
                      <div key={q.supplierId} className="space-y-1" data-testid={`quota-supplier-${q.supplierId}`}>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground truncate font-medium">{q.supplierName}</span>
                          <span className={`font-medium ${remainingTons <= 100 ? "text-red-500" : "text-orange-500"}`}>{remainingTons}t left</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>Quota: {maxTons}t</span>
                          <span>Received: {receivedTons}t</span>
                        </div>
                        <Progress value={usagePct} className="h-1.5" />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warehouse Utilization + Sensor Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Warehouse Utilization */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Warehouse Utilization</CardTitle>
            <p className="text-xs text-muted-foreground">Current capacity usage across all locations</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {(warehouseUtil || []).map((wh) => {
              const pct = wh.totalCapacityKg > 0 ? Math.round((wh.usedKg / wh.totalCapacityKg) * 100) : 0;
              return (
                <div key={wh.warehouseId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{wh.warehouseName}</p>
                      <p className="text-xs text-muted-foreground">{wh.warehouseLocation} · {wh.rooms.length} Rooms</p>
                    </div>
                    <span className="text-sm font-bold tabular-nums">{pct}%</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                  <p className="text-xs text-muted-foreground">{Math.round(wh.usedKg / 1000).toLocaleString()} tons / {Math.round(wh.totalCapacityKg / 1000).toLocaleString()} tons cap.</p>
                </div>
              );
            })}
            {(!warehouseUtil || warehouseUtil.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">No warehouses configured</p>
            )}
          </CardContent>
        </Card>

        {/* Sensor Alerts + Recent Activity */}
        <div className="space-y-4">
          {/* Sensor Alerts */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Sensor Alerts</CardTitle>
                <Badge variant={sensorAlerts && sensorAlerts.length > 0 ? "destructive" : "secondary"} className="text-xs">
                  {sensorAlerts?.length ?? 0} active
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {sensorAlerts && sensorAlerts.length > 0 ? (
                <div className="space-y-2">
                  {sensorAlerts.slice(0, 3).map((alert, i) => (
                    <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-destructive/5 border border-destructive/20">
                      <Thermometer className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold">{alert.roomName} · {alert.warehouseName}</p>
                        <p className="text-xs text-muted-foreground">
                          {alert.alertType === "temperature" ? `Temperature: ${alert.value}°C (limit: ${alert.limit}°C)` : 
                           alert.alertType === "humidity" ? `Humidity: ${alert.value}% (limit: ${alert.limit}%)` :
                           `CO₂: ${alert.value} ppm (limit: ${alert.limit} ppm)`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">No active alerts</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="inbound">
                <TabsList className="h-7 mb-3">
                  <TabsTrigger value="inbound" className="text-xs h-6">Inbound</TabsTrigger>
                  <TabsTrigger value="outbound" className="text-xs h-6">Outbound</TabsTrigger>
                </TabsList>
                <TabsContent value="inbound">
                  <div className="space-y-1.5">
                    {(batches || []).slice(0, 4).map(b => (
                      <div key={b.lotNumber} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                        <div className="min-w-0">
                          <p className="text-xs font-mono font-medium truncate">{b.lotNumber}</p>
                          <p className="text-xs text-muted-foreground">{Math.round(b.initialQuantityKg / 1000)}t received</p>
                        </div>
                        <Badge variant="outline" className={`text-xs shrink-0 ${b.acceptanceStatus === 'Accepted' ? 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30' : b.acceptanceStatus === 'Rejected' ? 'border-rose-300 text-rose-700 bg-rose-50 dark:bg-rose-950/30' : 'border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/30'}`}>
                          {b.acceptanceStatus}
                        </Badge>
                      </div>
                    ))}
                    {(!batches || batches.length === 0) && <p className="text-xs text-muted-foreground text-center py-2">No recent activity</p>}
                  </div>
                </TabsContent>
                <TabsContent value="outbound">
                  <div className="space-y-1.5">
                    {(shipments || []).slice(0, 4).map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                        <div className="min-w-0">
                          <p className="text-xs font-mono font-medium truncate">{s.batchId}</p>
                          <p className="text-xs text-muted-foreground">{Math.round(s.quantityKg / 1000)}t → {s.destination}</p>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">{s.shipmentType || "Full"}</Badge>
                      </div>
                    ))}
                    {(!shipments || shipments.length === 0) && <p className="text-xs text-muted-foreground text-center py-2">No shipments yet</p>}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
