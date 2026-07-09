import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowLeft, GraduationCap, Mail, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPassword,
  head: () => ({ meta: [{ title: "Reset password — Scholaris" }] }),
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setSent(true);
    toast.success("Reset link sent");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md animate-fade-up">
        <Link to="/login" className="inline-flex items-center gap-2 mb-8">
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
            <GraduationCap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold tracking-tight">Scholaris</span>
        </Link>

        <div className="surface p-8">
          {sent ? (
            <div className="text-center">
              <div className="h-11 w-11 mx-auto rounded-xl bg-success/10 text-success flex items-center justify-center mb-4">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <h1 className="text-xl font-semibold tracking-tight mb-2">Check your inbox</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                If an account exists for{" "}
                <span className="font-medium text-foreground">{email}</span>, a reset link is
                on its way. It should arrive within a minute.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold tracking-tight">Reset your password</h1>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    We'll email you a secure link.
                  </p>
                </div>
              </div>
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@school.edu"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  loading={loading}
                  loadingText="Sending…"
                >
                  Send reset link
                </Button>
              </form>
            </>
          )}
          <div className="mt-6 pt-6 border-t border-border text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sign in
            </Link>
          </div>
        </div>

        <p className="mt-6 text-[11px] text-muted-foreground text-center leading-relaxed">
          Student accounts use admission-number logins and can't receive reset emails —<br />
          ask your school admin to reset a student password.
        </p>
      </div>
    </div>
  );
}
