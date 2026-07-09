import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { GraduationCap, Lock, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  component: ResetPassword,
  head: () => ({ meta: [{ title: "Set new password — Scholaris" }] }),
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const strength = passwordStrength(password);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) return toast.error("Use at least 8 characters");
    if (password !== confirm) return toast.error("Passwords don't match");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    navigate({ to: "/login" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md animate-fade-up">
        <div className="inline-flex items-center gap-2 mb-8">
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
            <GraduationCap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold tracking-tight">Scholaris</span>
        </div>

        <div className="surface p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Set a new password</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Choose a strong password you haven't used before.
              </p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pw">New password</Label>
              <div className="relative">
                <Input
                  id="pw"
                  type={show ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-md"
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 grid grid-cols-4 gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-1 rounded-full ${
                          i < strength.score
                            ? strength.color
                            : "bg-border"
                        }`}
                      />
                    ))}
                  </div>
                  <span className={`text-[11px] font-medium ${strength.textColor}`}>
                    {strength.label}
                  </span>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cf">Confirm password</Label>
              <Input
                id="cf"
                type={show ? "text" : "password"}
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
              {confirm && confirm !== password && (
                <p className="text-[11px] text-destructive">Passwords don't match.</p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={loading}
              loadingText="Updating…"
            >
              Update password
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function passwordStrength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const map = [
    { label: "Too short", color: "bg-destructive", textColor: "text-destructive" },
    { label: "Weak", color: "bg-destructive", textColor: "text-destructive" },
    { label: "Fair", color: "bg-warning", textColor: "text-warning" },
    { label: "Good", color: "bg-primary", textColor: "text-primary" },
    { label: "Strong", color: "bg-success", textColor: "text-success" },
  ];
  return { score: s, ...map[s] };
}
