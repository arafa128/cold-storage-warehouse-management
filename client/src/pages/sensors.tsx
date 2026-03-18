import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Thermometer, Droplets, Wind, CheckCircle, AlertTriangle, Plus, Clock } from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { SensorAlertResponse, RoomResponse, WarehouseResponse } from "@shared/schema";

interface LatestSensor {
  id: number;
  roomId: number;
  temperature: string;
  humidity: string;
  co2Level: string;
  timestamp: string;
}

function SensorBar({ value, limit, unit }: { value: number; limit: number; unit: string }) {
  const pct = Math.min(100, (value / (limit * 1.3)) * 100);
  const isOver = value > limit;
  return (
    <div className="w-full">
      <div className="flex justify-between text-[11px] mb-0.5">
        <span className={isOver ? "text-destructive font-semibold" : "text-muted-foreground"}>
          {value}{unit}
        </span>
        <span className="text-muted-foreground/60">limit {limit}{unit}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isOver ? "bg-destructive" : "bg-emerald-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function Sensors() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    roomId: "",
    temperature: "",
    humidity: "",
    co2Level: "",
  });

  const { data: alerts, isLoading: alertsLoading } = useQuery<SensorAlertResponse[]>({
    queryKey: ["/api/sensors/alerts"],
    refetchInterval: 30000,
  });

  const { data: latestSensors } = useQuery<LatestSensor[]>({
    queryKey: ["/api/sensors/latest"],
    refetchInterval: 30000,
  });

  const { data: rooms } = useQuery<RoomResponse[]>({ queryKey: ["/api/rooms"] });
  const { data: warehouses } = useQuery<WarehouseResponse[]>({ queryKey: ["/api/warehouses"] });

  const roomMap = Object.fromEntries((rooms || []).map(r => [r.id, r]));
  const whMap = Object.fromEntries((warehouses || []).map(w => [w.id, w]));

  const logReading = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/sensors", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sensors/latest"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sensors/alerts"] });
      setIsOpen(false);
      setForm({ roomId: "", temperature: "", humidity: "", co2Level: "" });
      toast({ title: "Reading logged", description: "Sensor data has been recorded." });
    },
    onError: () => toast({ title: "Error", description: "Failed to log sensor reading.", variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    logReading.mutate({
      roomId: Number(form.roomId),
      temperature: form.temperature,
      humidity: form.humidity,
      co2Level: form.co2Level,
    });
  };

  const monitoredCount = latestSensors?.length ?? 0;
  const alertCount = alerts?.length ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sensor Monitoring</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Real-time temperature, humidity, and CO₂ levels</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-log-reading">
              <Plus className="w-4 h-4" /> Log Reading
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle>Log Sensor Reading</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Room *</Label>
                <Select value={form.roomId} onValueChange={v => setForm({ ...form, roomId: v })}>
                  <SelectTrigger data-testid="select-sensor-room"><SelectValue placeholder="Select room" /></SelectTrigger>
                  <SelectContent>
                    {(rooms || []).map(r => {
                      const wh = whMap[r.warehouseId];
                      return (
                        <SelectItem key={r.id} value={r.id.toString()}>
                          {r.name} – {wh?.name || "?"}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1"><Thermometer className="w-3 h-3" /> Temp (°C) *</Label>
                  <Input
                    type="number" required step="0.1" value={form.temperature}
                    onChange={e => setForm({ ...form, temperature: e.target.value })}
                    placeholder="e.g. 4.5"
                    data-testid="input-temperature"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1"><Droplets className="w-3 h-3" /> Humidity (%) *</Label>
                  <Input
                    type="number" required step="0.1" min="0" max="100" value={form.humidity}
                    onChange={e => setForm({ ...form, humidity: e.target.value })}
                    placeholder="e.g. 85"
                    data-testid="input-humidity"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1"><Wind className="w-3 h-3" /> CO₂ (ppm) *</Label>
                  <Input
                    type="number" required step="1" value={form.co2Level}
                    onChange={e => setForm({ ...form, co2Level: e.target.value })}
                    placeholder="e.g. 800"
                    data-testid="input-co2"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={logReading.isPending || !form.roomId} data-testid="button-save-reading">
                  {logReading.isPending ? "Saving..." : "Save Reading"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className={`border shadow-sm ${alertCount > 0 ? "border-destructive/30 bg-destructive/5" : ""}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Active Alerts</p>
                <p className={`text-2xl font-bold mt-0.5 ${alertCount > 0 ? "text-destructive" : ""}`}>{alertCount}</p>
              </div>
              <AlertTriangle className={`w-8 h-8 ${alertCount > 0 ? "text-destructive" : "text-muted-foreground/20"}`} />
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Monitored Rooms</p>
                <p className="text-2xl font-bold mt-0.5">{monitoredCount}</p>
              </div>
              <Thermometer className="w-8 h-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Normal Rooms</p>
                <p className="text-2xl font-bold mt-0.5 text-emerald-600">{Math.max(0, monitoredCount - alertCount)}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      {alertCount > 0 && (
        <Card className="border border-destructive/30 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <CardTitle className="text-sm font-semibold text-destructive">Active Threshold Alerts</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {(alerts || []).map((alert, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20" data-testid={`alert-${alert.roomId}-${alert.alertType}`}>
                <div className="flex items-center gap-3">
                  {alert.alertType === "temperature" && <Thermometer className="w-4 h-4 text-destructive shrink-0" />}
                  {alert.alertType === "humidity" && <Droplets className="w-4 h-4 text-destructive shrink-0" />}
                  {alert.alertType === "co2" && <Wind className="w-4 h-4 text-destructive shrink-0" />}
                  <div>
                    <p className="text-sm font-semibold capitalize">{alert.roomName} · {alert.warehouseName}</p>
                    <p className="text-xs text-muted-foreground">
                      {alert.alertType === "temperature" && `${alert.value}°C — exceeds limit of ${alert.limit}°C`}
                      {alert.alertType === "humidity" && `${alert.value}% — exceeds limit of ${alert.limit}%`}
                      {alert.alertType === "co2" && `${alert.value} ppm — exceeds limit of ${alert.limit} ppm`}
                    </p>
                  </div>
                </div>
                <Badge variant="destructive" className="text-xs shrink-0">Alert</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Per-Room Sensor Cards */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Room Status</h2>
        {alertsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
          </div>
        ) : (latestSensors || []).length === 0 ? (
          <Card className="border shadow-sm">
            <CardContent className="p-12 text-center text-muted-foreground">
              <Thermometer className="w-12 h-12 mx-auto mb-3 opacity-15" />
              <p className="text-sm font-medium text-foreground">No sensor data available</p>
              <p className="text-xs mt-1">Use "Log Reading" to record sensor data for a room.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(latestSensors || []).map(sensor => {
              const room = roomMap[sensor.roomId];
              const wh = room ? whMap[room.warehouseId] : null;
              const temp = Number(sensor.temperature);
              const humidity = Number(sensor.humidity);
              const co2 = Number(sensor.co2Level);
              const maxTemp = Number(room?.maxTempC || 5);
              const maxHumidity = Number(room?.maxHumidityPct || 95);
              const maxCo2 = Number(room?.maxCo2Ppm || 4000);
              const hasAlert = temp > maxTemp || humidity > maxHumidity || co2 > maxCo2;

              return (
                <Card key={sensor.id} className={`border shadow-sm ${hasAlert ? "border-destructive/40" : ""}`} data-testid={`card-sensor-room-${sensor.roomId}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-sm font-semibold capitalize">{room?.name || `Room ${sensor.roomId}`}</CardTitle>
                        <p className="text-xs text-muted-foreground capitalize">{wh?.name || "—"} · {room?.storageType || "—"}</p>
                      </div>
                      <Badge variant={hasAlert ? "destructive" : "secondary"} className="text-xs shrink-0">
                        {hasAlert ? "⚠ Alert" : "✓ Normal"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Thermometer className="w-3 h-3" /> Temperature
                      </div>
                      <SensorBar value={temp} limit={maxTemp} unit="°C" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Droplets className="w-3 h-3" /> Humidity
                      </div>
                      <SensorBar value={humidity} limit={maxHumidity} unit="%" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Wind className="w-3 h-3" /> CO₂
                      </div>
                      <SensorBar value={co2} limit={maxCo2} unit=" ppm" />
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground/60 pt-0.5">
                      <Clock className="w-3 h-3" />
                      {sensor.timestamp ? format(new Date(sensor.timestamp), "MMM dd, HH:mm") : "—"}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
