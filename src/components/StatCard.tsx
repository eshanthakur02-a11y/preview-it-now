import { LucideIcon, TrendingDown, TrendingUp, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";

type Tone = "primary" | "accent" | "success" | "warning" | "destructive" | "neutral";

/**
 * StatCard — Linear / Stripe style KPI card
 * Flat surface, hairline border, tiny icon chip, subtle hover.
 */
export function StatCard({
  label,
  value,
  delta,
  deltaLabel,
  icon: Icon,
  tone = "primary",
  hint,
  href,
  onClick,
  className,
}: {
  label: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
  icon: LucideIcon;
  tone?: Tone;
  hint?: string;
  href?: string;
  onClick?: () => void;
  className?: string;
}) {
  const toneChip: Record<Tone, string> = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-chart-2/10 text-chart-2",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    destructive: "bg-destructive/10 text-destructive",
    neutral: "bg-muted text-muted-foreground",
  };
  const positive = (delta ?? 0) >= 0;

  const inner = (
    <div
      className={cn(
        "group surface p-5 hover:shadow-sm hover:border-border transition-all duration-200 animate-fade-up",
        (href || onClick) && "cursor-pointer hover:-translate-y-[1px]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
            {hint && (
              <span
                className="hidden lg:inline-block text-[10px] text-muted-foreground/70"
                title={hint}
              >
                ⓘ
              </span>
            )}
          </div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-foreground tabular-nums">
            {value}
          </div>
          {typeof delta === "number" && (
            <div
              className={cn(
                "mt-2 inline-flex items-center gap-1 text-xs font-medium",
                positive ? "text-success" : "text-destructive",
              )}
            >
              {positive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {positive && "+"}{delta}%
              <span className="text-muted-foreground font-normal">{deltaLabel ?? "vs last month"}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center", toneChip[tone])}>
            <Icon className="h-4 w-4" />
          </div>
          {(href || onClick) && (
            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
          )}
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link to={href} className="block">{inner}</Link>;
  }
  if (onClick) {
    return <button type="button" onClick={onClick} className="block w-full text-left">{inner}</button>;
  }
  return inner;
}
