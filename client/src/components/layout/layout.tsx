import { ReactNode, useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("theme");
    if (stored) return stored === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  return [dark, setDark] as const;
}

export default function Layout({ children }: { children: ReactNode }) {
  const [dark, setDark] = useDarkMode();

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={style}>
      <div className="flex h-screen w-full bg-background overflow-hidden">
        <AppSidebar />
        <div className="flex flex-col flex-1 w-full overflow-hidden">
          <header className="h-14 flex items-center justify-between px-5 bg-card/50 backdrop-blur-md border-b border-border/50 z-10">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <span className="text-xs font-medium text-muted-foreground hidden sm:block tracking-wide">
                Cold Storage Management
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setDark(d => !d)}
              data-testid="button-toggle-dark-mode"
              title={dark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-8 page-transition">
            <div className="max-w-7xl mx-auto w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
