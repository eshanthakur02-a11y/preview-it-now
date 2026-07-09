import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { GraduationCap, Loader2, Eye, EyeOff, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ROLE_HOME, useAuth, type AppRole } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Sign in — Scholaris" }] }),
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, role, profile, loading, profileLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading || profileLoading) return;
    if (!user) return;
    if (role !== "super_admin") {
      if (profile.status === "suspended" || profile.schoolStatus === "suspended") {
        toast.error("Your account or school has been suspended. Contact your administrator.");
        supabase.auth.signOut();
        return;
      }
    }
    if (role) navigate({ to: ROLE_HOME[role] });
    else navigate({ to: "/no-role" });
  }, [user, role, profile, loading, profileLoading, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setSubmitting(false);
      return toast.error(error.message);
    }
    const uid = data.user?.id;
    if (!uid) {
      setSubmitting(false);
      return;
    }
    const [{ data: roleRow }, { data: prof }] = await Promise.all([
      supabase.from("user_roles").select("role,school_id").eq("user_id", uid).limit(1).maybeSingle(),
      supabase.from("profiles").select("school_id,status").eq("id", uid).maybeSingle(),
    ]);
    const r = (roleRow?.role as AppRole) ?? null;
    const sid = (prof?.school_id as string | null) ?? null;
    if (r !== "super_admin") {
      if (prof?.status === "suspended") {
        await supabase.auth.signOut();
        setSubmitting(false);
        return toast.error("Your account has been suspended. Contact your administrator.");
      }
      if (sid) {
        const { data: sch } = await supabase
          .from("schools")
          .select("status,features")
          .eq("id", sid)
          .maybeSingle();
        if (sch?.status === "suspended") {
          await supabase.auth.signOut();
          setSubmitting(false);
          return toast.error("Your school has been suspended. Contact your administrator.");
        }
        if (
          r === "student" &&
          (sch?.features as { student_login?: boolean } | null)?.student_login === false
        ) {
          await supabase.auth.signOut();
          setSubmitting(false);
          return toast.error("Student sign-in is disabled by your school. Please ask a parent or teacher.");
        }
      }
    }
    await supabase.from("profiles").update({ last_login: new Date().toISOString() }).eq("id", uid);

    setSubmitting(false);
    toast.success("Welcome back");
    if (!r) navigate({ to: "/no-role" });
    else navigate({ to: ROLE_HOME[r] });
  }

  if (loading || (user && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground gap-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground gap-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Redirecting…
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Form side */}
      <div className="flex items-center justify-center px-6 py-10 lg:px-16">
        <div className="w-full max-w-sm animate-fade-up">
          <Link to="/" className="inline-flex items-center gap-2 mb-10">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center shadow-xs">
              <GraduationCap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Scholaris</span>
          </Link>

          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Sign in to your school workspace to continue.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@school.edu"
                data-testid="login-email"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm">
                  Password
                </Label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-primary hover:underline underline-offset-4"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                  data-testid="login-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-md"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full gap-2"
              loading={submitting}
              loadingText="Signing in…"
              data-testid="login-submit"
            >
              Sign in
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="mt-8 text-xs text-muted-foreground text-center leading-relaxed">
            Accounts are provisioned by your school administrator.
            <br />
            Need help? Contact your admin.
          </p>
        </div>
      </div>

      {/* Marketing / brand side */}
      <div className="hidden lg:flex relative overflow-hidden border-l border-border bg-sidebar">
        <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />
        <div
          className="absolute -top-32 -right-32 h-96 w-96 rounded-full blur-3xl opacity-30"
          style={{ background: "var(--gradient-brand)" }}
          aria-hidden
        />
        <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full blur-3xl opacity-20"
             style={{ background: "var(--gradient-primary)" }}
             aria-hidden
        />

        <div className="relative flex flex-col justify-between p-12 w-full">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 backdrop-blur px-3 py-1 text-[11px] font-medium text-muted-foreground w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            All systems operational
          </div>

          <div className="max-w-md">
            <h2 className="text-3xl font-semibold tracking-tight leading-tight">
              The modern school operating system.
            </h2>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              Attendance, results, fees, transport, and communications — unified in
              one beautifully fast workspace. Built for schools that expect more.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-4 max-w-sm">
              {[
                ["7", "Role dashboards"],
                ["60+", "Modules"],
                ["Real-time", "Sync"],
              ].map(([n, l]) => (
                <div key={l} className="surface p-3">
                  <div className="text-lg font-semibold tracking-tight">{n}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground">
            © {new Date().getFullYear()} Scholaris · School Management System
          </div>
        </div>
      </div>
    </div>
  );
}
