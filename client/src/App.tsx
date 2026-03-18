import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout/layout";
import { useAuth } from "@/hooks/use-auth";
import { redirectToLogin } from "@/lib/auth-utils";
import { Loader2 } from "lucide-react";

import Dashboard from "@/pages/dashboard";
import Inbound from "@/pages/inbound";
import Inventory from "@/pages/inventory";
import Outbound from "@/pages/outbound";
import Losses from "@/pages/losses";
import Settings from "@/pages/settings";
import Warehouses from "@/pages/warehouses";
import Sensors from "@/pages/sensors";
import Reports from "@/pages/reports";
import Suppliers from "@/pages/suppliers";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard}/>
        <Route path="/inbound" component={Inbound}/>
        <Route path="/inventory" component={Inventory}/>
        <Route path="/outbound" component={Outbound}/>
        <Route path="/losses" component={Losses}/>
        <Route path="/warehouses" component={Warehouses}/>
        <Route path="/suppliers" component={Suppliers}/>
        <Route path="/sensors" component={Sensors}/>
        <Route path="/reports" component={Reports}/>
        <Route path="/settings" component={Settings}/>
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AuthWrapper />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function AuthWrapper() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    redirectToLogin();
    return null;
  }

  return <Router />;
}

export default App;
