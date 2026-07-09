import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROLE_HOME, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/access-denied")({
  component: AccessDenied,
  head: () => ({ meta: [{ title: "Access denied — Scholaris" }] }),
});

function AccessDenied() {
  const { role } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="surface p-10 max-w-md text-center animate-fade-up">
        <div className="h-12 w-12 mx-auto rounded-xl bg-destructive/10 text-destructive flex items-center justify-center mb-5">
          <Lock className="h-5 w-5" />
        </div>
        <h1 className="text-xl font-semibold mb-2 tracking-tight">Access denied</h1>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          You don't have permission to view that page. If you think this is a mistake,
          reach out to your school administrator.
        </p>
        <Button onClick={() => navigate({ to: role ? ROLE_HOME[role] : "/login" })} className="gap-2">
          Back to my dashboard
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
