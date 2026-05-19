import { useEffect, useState, useCallback } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { NotificationBell } from "@/components/NotificationBell";
import { CalendarClock, Stethoscope, LogOut } from "lucide-react";

export const Route = createFileRoute("/patient/home")({
  component: PatientHomePage,
  head: () => ({
    meta: [
      { title: "My Health — PatientTracker" },
      { name: "description", content: "View your appointments and notifications." },
    ],
  }),
});

interface Appointment {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  reason: string | null;
  notes: string | null;
  status: string;
}

function PatientHomePage() {
  const navigate = useNavigate();
  const { user, loading, isAuthenticated, signOut, displayName } = useAuth();
  const [patientId, setPatientId] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) navigate({ to: "/staff/login" });
  }, [loading, isAuthenticated, navigate]);

  const load = useCallback(async () => {
    if (!user) return;
    const { data: account } = await supabase
      .from("patient_accounts")
      .select("patient_id")
      .eq("user_id", user.id)
      .maybeSingle();
    const pid = account?.patient_id ?? null;
    setPatientId(pid);
    if (pid) {
      const { data } = await supabase
        .from("appointments")
        .select("id, scheduled_at, duration_minutes, reason, notes, status")
        .eq("patient_id", pid)
        .order("scheduled_at", { ascending: true });
      setAppointments((data ?? []) as Appointment[]);
    }
    setFetching(false);
  }, [user]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  if (loading || fetching) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Skeleton className="mx-auto h-64 max-w-3xl" />
      </div>
    );
  }

  if (!patientId) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-2xl text-center">
          <Stethoscope className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 font-heading text-xl font-semibold">No patient record linked</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account ({user?.email}) is not yet linked to a patient record. Please contact your care team.
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={signOut}>
            <LogOut className="mr-1 h-4 w-4" /> Sign out
          </Button>
        </div>
      </div>
    );
  }

  const upcoming = appointments.filter((a) => new Date(a.scheduled_at) >= new Date() && a.status !== "cancelled");
  const past = appointments.filter((a) => new Date(a.scheduled_at) < new Date() || a.status === "cancelled");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
              <Stethoscope className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="font-heading text-sm font-semibold">My Health</h1>
              <p className="text-[11px] text-muted-foreground">{displayName || user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell patientId={patientId} />
            <Button size="icon" variant="ghost" onClick={signOut} aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6 animate-fade-in">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" />
              <CardTitle>Upcoming appointments</CardTitle>
            </div>
            <CardDescription>You'll be notified here and by email when your care team schedules a visit.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcoming.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No upcoming appointments.</p>
            ) : (
              upcoming.map((a) => <AppointmentCard key={a.id} appointment={a} />)
            )}
          </CardContent>
        </Card>

        {past.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Past appointments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {past.slice(0, 10).map((a) => <AppointmentCard key={a.id} appointment={a} muted />)}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

function AppointmentCard({ appointment, muted }: { appointment: Appointment; muted?: boolean }) {
  const dt = new Date(appointment.scheduled_at);
  return (
    <div className={`rounded-lg border p-3 ${muted ? "opacity-70" : "border-primary/20 bg-primary/5"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{dt.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">
            {appointment.duration_minutes} min{appointment.reason ? ` · ${appointment.reason}` : ""}
          </p>
          {appointment.notes && <p className="mt-1 text-xs text-muted-foreground">{appointment.notes}</p>}
        </div>
        <Badge variant={appointment.status === "scheduled" ? "default" : "secondary"} className="capitalize">
          {appointment.status}
        </Badge>
      </div>
    </div>
  );
}
