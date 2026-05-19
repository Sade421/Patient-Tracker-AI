import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Stethoscope, CheckCircle2, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/unsubscribe")({
  component: UnsubscribePage,
  head: () => ({
    meta: [{ title: "Unsubscribe — PatientTracker" }, { name: "robots", content: "noindex" }],
  }),
});

type State =
  | { status: "loading" }
  | { status: "valid" }
  | { status: "already" }
  | { status: "invalid"; message: string }
  | { status: "success" };

function UnsubscribePage() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [submitting, setSubmitting] = useState(false);

  const token = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("token") : null;

  useEffect(() => {
    if (!token) {
      setState({ status: "invalid", message: "Missing unsubscribe token." });
      return;
    }
    fetch(`/email/unsubscribe?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setState({ status: "invalid", message: data.error || "Invalid link." });
        } else if (data.valid) {
          setState({ status: "valid" });
        } else if (data.reason === "already_unsubscribed") {
          setState({ status: "already" });
        } else {
          setState({ status: "invalid", message: "This link is no longer valid." });
        }
      })
      .catch(() => setState({ status: "invalid", message: "Could not verify the link." }));
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setSubmitting(true);
    try {
      const res = await fetch("/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.success || data.reason === "already_unsubscribed") {
        setState({ status: "success" });
      } else {
        setState({ status: "invalid", message: data.error || "Could not unsubscribe." });
      }
    } catch {
      setState({ status: "invalid", message: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
            <Stethoscope className="h-5 w-5 text-primary" />
          </div>
          <CardTitle className="mt-2">Email preferences</CardTitle>
          <CardDescription>PatientTracker</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center text-sm">
          {state.status === "loading" && <p className="text-muted-foreground">Verifying your link...</p>}

          {state.status === "valid" && (
            <>
              <p>Click below to unsubscribe from non-essential emails.</p>
              <p className="text-xs text-muted-foreground">
                Note: critical clinical notifications (appointments, account security) will still be sent.
              </p>
              <Button onClick={confirm} disabled={submitting} className="w-full">
                {submitting ? "Unsubscribing..." : "Confirm unsubscribe"}
              </Button>
            </>
          )}

          {state.status === "success" && (
            <div className="space-y-2">
              <CheckCircle2 className="mx-auto h-8 w-8 text-primary" />
              <p className="font-medium">You've been unsubscribed.</p>
              <p className="text-xs text-muted-foreground">You will no longer receive non-essential emails.</p>
            </div>
          )}

          {state.status === "already" && (
            <div className="space-y-2">
              <CheckCircle2 className="mx-auto h-8 w-8 text-muted-foreground" />
              <p>You're already unsubscribed.</p>
            </div>
          )}

          {state.status === "invalid" && (
            <div className="space-y-2">
              <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
              <p className="font-medium">Link not valid</p>
              <p className="text-xs text-muted-foreground">{state.message}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
