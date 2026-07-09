import { useEffect, useState } from "react";
import { Bell, Check, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState } from "@/components/EmptyState";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

type Notification = {
  id: string;
  title: string;
  body: string | null;
  kind: string;
  read_at: string | null;
  created_at: string;
};

export function NotificationBell({ userId }: { userId: string }) {
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const unread = items.filter((n) => !n.read_at).length;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data } = await supabase
        .from("notifications")
        .select("id,title,body,kind,read_at,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(25);
      if (!cancelled) setItems((data ?? []) as Notification[]);
    }
    load();
    const ch = supabase
      .channel(`notif:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        load,
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [userId]);

  async function markAll() {
    await supabase.rpc("mark_all_notifications_read");
    setItems((xs) => xs.map((x) => ({ ...x, read_at: x.read_at ?? new Date().toISOString() })));
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
          className="relative"
          data-testid="notif-bell"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-semibold flex items-center justify-center ring-2 ring-background">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[360px] p-0 max-h-[68vh] overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold">Notifications</div>
            {unread > 0 && (
              <span className="inline-flex items-center px-1.5 h-4 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                {unread} new
              </span>
            )}
          </div>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={markAll}>
              <Check className="h-3 w-3" /> Mark all read
            </Button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <EmptyState
              icon={BellOff}
              title="You're all caught up"
              description="New alerts will show up here."
              compact
            />
          ) : (
            items.map((n) => (
              <div
                key={n.id}
                className={cn(
                  "px-4 py-3 border-b border-border/60 last:border-0 hover:bg-accent/40 transition-colors relative",
                  !n.read_at && "bg-primary/[0.04]",
                )}
              >
                {!n.read_at && (
                  <span className="absolute left-1.5 top-4 h-1.5 w-1.5 rounded-full bg-primary" />
                )}
                <div className="text-sm font-medium leading-tight text-foreground pl-3">
                  {n.title}
                </div>
                {n.body && (
                  <div className="text-xs text-muted-foreground mt-1 pl-3 leading-relaxed">
                    {n.body}
                  </div>
                )}
                <div className="text-[10px] text-muted-foreground mt-1.5 pl-3">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
