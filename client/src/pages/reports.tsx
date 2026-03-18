import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, Download, Truck, PackageSearch, ArrowUpRightSquare, 
  AlertTriangle, Clock, CalendarClock
} from "lucide-react";

interface ReportType {
  id: string;
  label: string;
  description: string;
  icon: any;
  endpoint: string;
  filename: string;
  color: string;
  bg: string;
}

const REPORTS: ReportType[] = [
  {
    id: "inbound",
    label: "Inbound Report",
    description: "All truck arrivals with lot numbers, weights, acceptance status, and storage location.",
    icon: Truck,
    endpoint: "/api/reports/inbound",
    filename: "inbound-report.csv",
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950/30",
  },
  {
    id: "outbound",
    label: "Outbound Report",
    description: "All outbound shipments with destination, quantity, and shipment number.",
    icon: ArrowUpRightSquare,
    endpoint: "/api/reports/outbound",
    filename: "outbound-report.csv",
    color: "text-violet-600",
    bg: "bg-violet-50 dark:bg-violet-950/30",
  },
  {
    id: "inventory",
    label: "Inventory Snapshot",
    description: "Current inventory state for all batches including initial and remaining quantities.",
    icon: PackageSearch,
    endpoint: "/api/reports/inventory",
    filename: "inventory-snapshot.csv",
    color: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  {
    id: "losses",
    label: "Loss Report",
    description: "Full history of inventory losses including type, quantity, and notes.",
    icon: AlertTriangle,
    endpoint: "/api/reports/losses",
    filename: "loss-report.csv",
    color: "text-rose-600",
    bg: "bg-rose-50 dark:bg-rose-950/30",
  },
  {
    id: "aging",
    label: "Aging Analysis",
    description: "Inventory age breakdown by days in storage — categorized into 0-30, 30-60, and 60+ day buckets.",
    icon: Clock,
    endpoint: "/api/reports/aging",
    filename: "aging-report.csv",
    color: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-950/30",
  },
  {
    id: "expiration",
    label: "Expiration Alert",
    description: "Batches expiring within 30 days — sorted by urgency with days remaining.",
    icon: CalendarClock,
    endpoint: "/api/reports/expiration",
    filename: "expiration-alert.csv",
    color: "text-orange-600",
    bg: "bg-orange-50 dark:bg-orange-950/30",
  },
];

export default function Reports() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (report: ReportType) => {
    setDownloading(report.id);
    try {
      const response = await fetch(report.endpoint);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = report.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Generate and download CSV reports for analysis</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORTS.map(report => (
          <Card key={report.id} className="border shadow-sm flex flex-col" data-testid={`card-report-${report.id}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-lg ${report.bg} shrink-0`}>
                  <report.icon className={`w-4 h-4 ${report.color}`} />
                </div>
                <div>
                  <CardTitle className="text-sm">{report.label}</CardTitle>
                  <Badge variant="secondary" className="text-xs mt-1">CSV</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between gap-4">
              <p className="text-xs text-muted-foreground leading-relaxed">{report.description}</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => handleDownload(report)}
                disabled={downloading === report.id}
                data-testid={`button-download-${report.id}`}
              >
                <Download className="w-3.5 h-3.5" />
                {downloading === report.id ? "Downloading..." : "Download CSV"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border shadow-sm bg-muted/20">
        <CardContent className="p-5 flex items-start gap-3">
          <FileText className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium">About these reports</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              All reports are generated in CSV format based on the current database state at time of export.
              Open in Excel, Google Sheets, or any data tool for analysis. Weights are shown in metric tons.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
