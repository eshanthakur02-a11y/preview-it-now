import { createFileRoute } from "@tanstack/react-router";
import { UserRoundX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth";

export const Route = createFileRoute("/no-role")({
  component: NoRole,
  head: () => ({ meta: [{ title: "No role assigned — Scholaris" }] }),
});

function NoRole() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="surface p-10 max-w-md text-center animate-fade-up">
        <div className="h-12 w-12 mx-auto rounded-xl bg-warning/10 text-warning flex items-center justify-center mb-5">
          <UserRoundX className="h-5 w-5" />
        </div>
        <h1 className="text-xl font-semibold mb-2 tracking-tight">No role assigned</h1>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          Your account is signed in, but no role has been assigned yet. Please
          contact your school administrator (or the Scholaris super admin) to
          grant you access.
        </p>
        <Button variant="outline" onClick={() => signOut()}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
