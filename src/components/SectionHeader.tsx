import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * SectionHeader — small header used inside cards / sections
 * (title + optional icon, description, right-side actions or link)
 */
export function SectionHeader({
  title,
  description,
  icon: Icon,
  actions,
  className,
  size = "md",
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <h3
          className={cn(
            "font-semibold tracking-tight text-foreground inline-flex items-center gap-2",
            size === "sm" ? "text-sm" : "text-base",
          )}
        >
          {Icon && <Icon className={cn(size === "sm" ? "h-4 w-4" : "h-4 w-4", "text-muted-foreground")} />}
          {title}
        </h3>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
    </div>
  );
}
