import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  GraduationCap,
  LogOut,
  Menu,
  Moon,
  Sun,
  User,
  ChevronDown,
  Search,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABEL, signOut, useAuth, type AppRole } from "@/lib/auth";
import { NotificationBell } from "@/components/NotificationBell";
import { cn } from "@/lib/utils";

export type NavItem = { to: string; label: string; icon: LucideIcon; group?: string };

function initials(email?: string | null) {
  if (!email) return "US";
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]/).filter(Boolean);
  const s = (parts[0]?.[0] ?? local[0] ?? "U") + (parts[1]?.[0] ?? local[1] ?? "");
  return s.toUpperCase();
}

export function RoleShell({
  role,
  navItems,
  children,
}: {
  role: AppRole;
  navItems: NavItem[];
  children: React.ReactNode;
}) {
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role: currentRole, schoolId, profile, loading, profileLoading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (profileLoading) return;
    if (!currentRole) {
      navigate({ to: "/no-role" });
      return;
    }
    if (
      currentRole !== "super_admin" &&
      (profile.status === "suspended" || profile.schoolStatus === "suspended")
    ) {
      navigate({ to: "/access-denied" });
      return;
    }
    if (currentRole !== role) navigate({ to: "/access-denied" });
  }, [user, currentRole, profile, loading, profileLoading, role, navigate]);

  useEffect(() => {
    if (!user || currentRole === "super_admin" || !schoolId) return;
    supabase
      .from("schools")
      .select("status")
      .eq("id", schoolId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.status === "suspended") signOut();
      });
  }, [location.pathname, user, currentRole, schoolId]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const groups = useMemo(() => {
    const map = new Map<string, NavItem[]>();
    for (const it of navItems) {
      const g = it.group ?? "Main";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(it);
    }
    return Array.from(map.entries());
  }, [navItems]);

  const filteredGroups = useMemo(() => {
    if (!query.trim()) return groups;
    const q = query.toLowerCase();
    return groups
      .map(([g, items]) => [g, items.filter((it) => it.label.toLowerCase().includes(q))] as const)
      .filter(([, items]) => items.length > 0);
  }, [groups, query]);

  if (loading || profileLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground gap-2">
        <span className="h-3 w-3 rounded-full bg-primary animate-pulse" />
        Loading workspace…
      </div>
    );
  }

  const activeLabel =
    navItems.find((it) => location.pathname === it.to)?.label ??
    navItems.find((it) => location.pathname.startsWith(it.to) && it.to !== "/")?.label ??
    ROLE_LABEL[role];

  const Brand = ({ collapsed = false }: { collapsed?: boolean }) => (
    <Link
      to={navItems[0]?.to ?? "/"}
      className={cn("flex items-center gap-2.5 px-2 py-1 rounded-lg", collapsed && "justify-center")}
    >
      <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-xs">
        <GraduationCap className="h-4 w-4 text-primary-foreground" />
      </div>
      {!collapsed && (
        <div className="min-w-0 leading-tight">
          <div className="font-semibold text-sm tracking-tight truncate text-sidebar-foreground">
            Scholaris
          </div>
          <div className="text-[11px] text-muted-foreground truncate">
            {ROLE_LABEL[role]}
          </div>
        </div>
      )}
    </Link>
  );

  const NavSearch = () => (
    <div className="px-2 mb-2">
      <div className="relative">
        <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Jump to…"
          className="w-full h-8 pl-8 pr-2 rounded-md text-xs bg-muted/60 border border-border/60 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition"
        />
      </div>
    </div>
  );

  const NavList = () => (
    <nav className="flex flex-col gap-4 overflow-y-auto flex-1 pb-4">
      {filteredGroups.map(([group, items]) => (
        <div key={group}>
          <div className="px-3 mb-1.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70 font-semibold">
            {group}
          </div>
          <div className="flex flex-col gap-px">
            {items.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to;
              return (
                <Link
                  key={to + label}
                  to={to}
                  className={cn(
                    "group relative flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60",
                  )}
                >
                  {active && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-primary" />
                  )}
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                    )}
                  />
                  <span className="truncate">{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
      {filteredGroups.length === 0 && (
        <div className="text-xs text-muted-foreground text-center py-6">
          No matches for “{query}”
        </div>
      )}
    </nav>
  );

  const UserFooter = () => (
    <div className="border-t border-sidebar-border pt-3 mt-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-sidebar-accent/60 transition-colors">
            <div className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
              {initials(user.email)}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <div className="text-sm font-medium truncate text-sidebar-foreground">
                {user.email?.split("@")[0]}
              </div>
              <div className="text-[11px] text-muted-foreground truncate">{user.email}</div>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-56">
          <DropdownMenuLabel>
            <div className="text-sm font-medium">{user.email?.split("@")[0]}</div>
            <div className="text-[11px] text-muted-foreground">{ROLE_LABEL[role]}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={toggle}>
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/notifications">
              <User className="h-4 w-4" />
              <span>Notifications</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4" />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[248px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 py-4 sticky top-0 h-screen">
        <div className="mb-3">
          <Brand />
        </div>
        <NavSearch />
        <NavList />
        <UserFooter />
      </aside>

      {/* Main area */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 px-4 md:px-6 lg:px-8 h-14 bg-background/85 backdrop-blur-xl border-b border-border">
          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="md:hidden" aria-label="Open menu">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-4 flex flex-col bg-sidebar">
              <div className="mb-3">
                <Brand />
              </div>
              <NavSearch />
              <NavList />
              <UserFooter />
            </SheetContent>
          </Sheet>

          {/* Current section title (mobile shows role; desktop shows crumb) */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-medium text-foreground truncate">{activeLabel}</span>
          </div>

          <div className="ml-auto flex items-center gap-1">
            <NotificationBell userId={user.id} />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggle}
              aria-label="Toggle theme"
              title={theme === "dark" ? "Switch to light" : "Switch to dark"}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </header>

        <main className="flex-1 px-4 md:px-6 lg:px-8 py-6 md:py-8 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
