import { Inbox, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className = "",
  compact,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-6",
        compact ? "py-8" : "py-16",
        className,
      )}
    >
      <div
        className={cn(
          "relative flex items-center justify-center rounded-full",
          compact ? "h-11 w-11 mb-3" : "h-14 w-14 mb-4",
          "bg-muted",
        )}
      >
        <div
          aria-hidden
          className="absolute inset-0 rounded-full ring-1 ring-inset ring-border"
        />
        <Icon className={cn("text-muted-foreground", compact ? "h-5 w-5" : "h-6 w-6")} />
      </div>
      <h3 className={cn("font-semibold text-foreground", compact ? "text-sm" : "text-base")}>
        {title}
      </h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-1.5 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
