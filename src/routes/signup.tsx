import { createFileRoute, Link } from "@tanstack/react-router";
import { GraduationCap, ArrowLeft, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/signup")({
  component: SignupClosed,
  head: () => ({ meta: [{ title: "Sign up — Scholaris" }] }),
});

function SignupClosed() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md surface p-8 text-center animate-fade-up">
        <div className="h-11 w-11 mx-auto rounded-xl bg-muted flex items-center justify-center mb-4 ring-1 ring-inset ring-border">
          <ShieldAlert className="h-5 w-5 text-muted-foreground" />
        </div>
        <Link to="/login" className="inline-flex items-center gap-1.5 mb-6 text-xs font-medium text-muted-foreground">
          <GraduationCap className="h-3.5 w-3.5" />
          Scholaris
        </Link>
        <h1 className="text-xl font-semibold mb-2 tracking-tight">Self sign-up is disabled</h1>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          Scholaris accounts are created by your school administrator. Teachers,
          students, accountants, and parents receive their login from the school
          admin. School admins are created by the platform Super Admin.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline underline-offset-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
