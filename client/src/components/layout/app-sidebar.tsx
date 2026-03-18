import { Link, useLocation } from "wouter";
import { 
  BarChart3, Truck, PackageSearch, ArrowUpRightSquare, AlertTriangle, 
  Settings, ThermometerSnowflake, LogOut, Warehouse, Thermometer, FileText, Users
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import type { SensorAlertResponse } from "@shared/schema";

const navItems = [
  { title: "Dashboard", url: "/", icon: BarChart3 },
  { title: "Inbound", url: "/inbound", icon: Truck },
  { title: "Inventory", url: "/inventory", icon: PackageSearch },
  { title: "Outbound", url: "/outbound", icon: ArrowUpRightSquare },
  { title: "Losses", url: "/losses", icon: AlertTriangle },
];

const managementItems = [
  { title: "Warehouses", url: "/warehouses", icon: Warehouse },
  { title: "Suppliers", url: "/suppliers", icon: Users },
  { title: "Sensors", url: "/sensors", icon: Thermometer },
  { title: "Reports", url: "/reports", icon: FileText },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const { data: alerts } = useQuery<SensorAlertResponse[]>({
    queryKey: ["/api/sensors/alerts"],
    refetchInterval: 30000,
  });

  const alertCount = alerts?.length ?? 0;

  const renderNavItem = (item: typeof navItems[0]) => {
    const isActive = location === item.url || (item.url !== "/" && location.startsWith(item.url));
    const showBadge = item.url === "/sensors" && alertCount > 0;

    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
          <Link href={item.url} className={`
            flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150
            ${isActive 
              ? "bg-primary/10 text-primary font-semibold" 
              : "text-sidebar-foreground"
            }
          `}>
            <item.icon className={`w-4 h-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
            <span className="flex-1">{item.title}</span>
            {showBadge && (
              <Badge variant="destructive" className="text-xs h-5 min-w-5 px-1.5">{alertCount}</Badge>
            )}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar className="border-r border-border">
      <SidebarHeader className="h-14 flex items-center px-5 border-b border-border">
        <div className="flex items-center gap-2.5 font-bold text-base text-primary">
          <ThermometerSnowflake className="w-5 h-5" />
          <span>FrostGuard</span>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="py-4 gap-0">
        <SidebarGroup className="mb-2">
          <SidebarGroupLabel className="px-5 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Operations
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="px-3 gap-0.5">
              {navItems.map(renderNavItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="px-5 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="px-3 gap-0.5">
              {managementItems.map(renderNavItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold truncate">{user?.firstName || user?.email || "User"}</span>
            <span className="text-xs text-muted-foreground">{user?.role || "Viewer"}</span>
          </div>
          <button 
            onClick={() => logout()}
            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
            title="Log out"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
