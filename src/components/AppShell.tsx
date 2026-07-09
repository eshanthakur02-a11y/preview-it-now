import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Bell,
  Search,
  Sun,
  Moon,
  GraduationCap,
} from "lucide-react";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Legacy generic app shell — the app now uses RoleShell for authenticated pages.
 * Kept for backwards compatibility with any legacy imports.
 */
const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/notifications", label: "Notifications", icon: Bell },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { theme, toggle } = useTheme();
  const location = useLocation();

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex w-[240px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 py-4 sticky top-0 h-screen">
        <div className="flex items-center gap-2 px-2 mb-8">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <GraduationCap className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <div className="font-semibold tracking-tight text-sm">Scholaris</div>
            <div className="text-[11px] text-muted-foreground">Analytics</div>
          </div>
        </div>
        <nav className="flex flex-col gap-px">
          {nav.map(({ to, label, icon: Icon }) => {
            const active =
              to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 px-4 md:px-8 h-14 backdrop-blur-xl bg-background/85 border-b border-border">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search…" className="pl-9 h-9" />
          </div>
          <Button variant="ghost" size="icon-sm" onClick={toggle} aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Link to="/notifications">
            <Button variant="ghost" size="icon-sm" aria-label="Notifications">
              <Bell className="h-4 w-4" />
            </Button>
          </Link>
        </header>
        <main className="flex-1 px-4 md:px-8 py-6 md:py-8">{children}</main>
      </div>
    </div>
  );
}
