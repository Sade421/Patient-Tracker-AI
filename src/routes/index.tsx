import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "PatientTracker — Clinical Staff" },
      { name: "description", content: "Sign in as clinical staff to admit patients." },
    ],
  }),
});

function Index() {
  const { isAuthenticated, hasAnyRole, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated || !hasAnyRole()) navigate({ to: "/staff/login" });
    else navigate({ to: "/staff/dashboard" });
  }, [loading, isAuthenticated, hasAnyRole, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
