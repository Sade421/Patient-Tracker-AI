import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Stethoscope } from "lucide-react";

export const Route = createFileRoute("/staff/login")({
  component: StaffLoginPage,
  head: () => ({
    meta: [
      { title: "Clinical Staff Login — PatientTracker" },
      { name: "description", content: "Sign in as a Doctor or Nurse to admit patients and view the census." },
    ],
  }),
});

function StaffLoginPage() {
  const { signIn, isAuthenticated, hasAnyRole, loading } = useAuth();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"doctor" | "nurse" | "charge_nurse">("doctor");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated && hasAnyRole()) {
      navigate({ to: "/staff/dashboard" });
    }
  }, [loading, isAuthenticated, hasAnyRole, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/staff/admit`,
            data: { display_name: displayName, account_type: "staff", role },
          },
        });
        if (signUpError) throw signUpError;
        if (data.user && data.session) {
          await supabase.from("user_roles").insert({ user_id: data.user.id, role });
          navigate({ to: "/staff/admit" });
          return;
        }
        setSignUpSuccess(true);
      } else {
        await signIn(email, password);
        navigate({ to: "/staff/admit" });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (signUpSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Check your email</CardTitle>
            <CardDescription>
              We sent a confirmation link to <span className="text-primary">{email}</span>.
              Verify your account, then sign in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => { setSignUpSuccess(false); setIsSignUp(false); }}>
              Back to sign in
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Stethoscope className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="font-heading text-2xl">
            {isSignUp ? "Create staff account" : "Clinical Staff Login"}
          </CardTitle>
          <CardDescription>
            {isSignUp ? "Register as a Doctor or Nurse" : "Sign in to admit patients and view census"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="displayName">Full name</Label>
                  <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button type="button" variant={role === "doctor" ? "default" : "outline"} onClick={() => setRole("doctor")}>
                      Doctor
                    </Button>
                    <Button type="button" variant={role === "nurse" ? "default" : "outline"} onClick={() => setRole("nurse")}>
                      Nurse
                    </Button>
                    <Button type="button" variant={role === "charge_nurse" ? "default" : "outline"} onClick={() => setRole("charge_nurse")}>
                      Charge Nurse
                    </Button>
                  </div>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Please wait..." : isSignUp ? "Create account" : "Sign in"}
            </Button>
          </form>
          <div className="mt-4 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
              className="text-sm text-muted-foreground hover:text-primary"
            >
              {isSignUp ? "Already have a staff account? Sign in" : "Need a staff account? Sign up"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
