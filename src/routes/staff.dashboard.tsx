import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { StaffShell } from "@/components/StaffShell";
import {
  Activity,
  CalendarClock,
  ClipboardList,
  Clock,
  Search,
  Siren,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/staff/dashboard")({
  component: StaffDashboardPage,
  head: () => ({
    meta: [
      { title: "Home Dashboard — PatientTracker" },
      {
        name: "description",
        content:
          "Central clinical hub: track patient journey, treatment progress, and upcoming appointments at a glance.",
      },
    ],
  }),
});

type Patient = {
  id: string;
  name: string;
  age: number;
  gender: string | null;
  room_number: string | null;
  created_at: string;
};

type Visit = {
  id: string;
  patient_id: string;
  admission_time: string;
  seen_time: string | null;
  completed_time: string | null;
  documentation_complete: boolean;
  last_interaction_at: string | null;
  acuity_score: number | null;
};

type Appointment = {
  id: string;
  patient_id: string;
  scheduled_at: string;
  status: string;
  reason: string | null;
};

type Stage =
  | "in_triage"
  | "awaiting_labs"
  | "under_care"
  | "ready_for_discharge"
  | "discharged";

type Row = {
  patient: Patient;
  activeVisit: Visit | null;
  nextAppointment: Appointment | null;
  stage: Stage;
  progress: number;
  minutesSinceLast: number | null;
};

const STAGE_META: Record<Stage, { label: string; cls: string; progress: number }> = {
  in_triage: {
    label: "In Triage",
    cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    progress: 20,
  },
  awaiting_labs: {
    label: "Awaiting Labs",
    cls: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30",
    progress: 45,
  },
  under_care: {
    label: "Under Care",
    cls: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30",
    progress: 65,
  },
  ready_for_discharge: {
    label: "Ready for Discharge",
    cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    progress: 90,
  },
  discharged: {
    label: "Discharged",
    cls: "bg-muted text-muted-foreground border-border",
    progress: 100,
  },
};

function deriveStage(v: Visit | null): Stage {
  if (!v) return "discharged";
  if (v.completed_time) return "discharged";
  if (v.documentation_complete) return "ready_for_discharge";
  if (v.seen_time) return (v.acuity_score ?? 0) >= 6 ? "awaiting_labs" : "under_care";
  return "in_triage";
}

function fmtCountdown(target: string | null, now: number): { label: string; tone: "neutral" | "soon" | "overdue" } {
  if (!target) return { label: "No appointment", tone: "neutral" };
  const diff = new Date(target).getTime() - now;
  const absMin = Math.round(Math.abs(diff) / 60_000);
  if (diff < 0) {
    return { label: `${absMin}m overdue`, tone: "overdue" };
  }
  const h = Math.floor(absMin / 60);
  const m = absMin % 60;
  const label = h > 0 ? `in ${h}h ${m}m` : `in ${m}m`;
  return { label, tone: absMin <= 30 ? "soon" : "neutral" };
}

function fmtAgo(min: number | null) {
  if (min === null) return "—";
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  return `${h}h ${min % 60}m ago`;
}

function StaffDashboardPage() {
  const navigate = useNavigate();
  const { isAuthenticated, hasAnyRole, loading, displayName, user, roles } = useAuth();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<Stage | "all" | "active">("active");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated || !hasAnyRole()) navigate({ to: "/staff/login" });
  }, [loading, isAuthenticated, hasAnyRole, navigate]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const loadData = useCallback(async () => {
    const [{ data: ps }, { data: vs }, { data: as }] = await Promise.all([
      supabase
        .from("patients")
        .select("id, name, age, gender, room_number, created_at")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("visits")
        .select(
          "id, patient_id, admission_time, seen_time, completed_time, documentation_complete, last_interaction_at, acuity_score",
        )
        .order("admission_time", { ascending: false })
        .limit(1000),
      supabase
        .from("appointments")
        .select("id, patient_id, scheduled_at, status, reason")
        .neq("status", "completed")
        .neq("status", "cancelled")
        .order("scheduled_at", { ascending: true })
        .limit(1000),
    ]);
    setPatients((ps ?? []) as Patient[]);
    setVisits((vs ?? []) as Visit[]);
    setAppointments((as ?? []) as Appointment[]);
    setFetching(false);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !hasAnyRole()) return;
    loadData();
    const id = window.setInterval(loadData, 30_000);
    return () => window.clearInterval(id);
  }, [isAuthenticated, hasAnyRole, loadData]);

  const rows: Row[] = useMemo(() => {
    const visitsByPatient: Record<string, Visit[]> = {};
    visits.forEach((v) => (visitsByPatient[v.patient_id] ||= []).push(v));
    const apptByPatient: Record<string, Appointment> = {};
    appointments.forEach((a) => {
      const existing = apptByPatient[a.patient_id];
      if (!existing || new Date(a.scheduled_at) < new Date(existing.scheduled_at)) {
        apptByPatient[a.patient_id] = a;
      }
    });

    const built = patients.map<Row>((p) => {
      const list = visitsByPatient[p.id] ?? [];
      const active = list.find((v) => !v.completed_time) ?? null;
      const stage = deriveStage(active);
      const ref = active?.last_interaction_at ?? active?.admission_time ?? null;
      const minutesSinceLast = ref
        ? Math.max(0, Math.floor((now - new Date(ref).getTime()) / 60_000))
        : null;
      return {
        patient: p,
        activeVisit: active,
        nextAppointment: apptByPatient[p.id] ?? null,
        stage,
        progress: STAGE_META[stage].progress,
        minutesSinceLast,
      };
    });

    const q = search.trim().toLowerCase();
    return built
      .filter((r) => {
        if (stageFilter === "all") return true;
        if (stageFilter === "active") return r.stage !== "discharged";
        return r.stage === stageFilter;
      })
      .filter(
        (r) =>
          !q ||
          r.patient.name.toLowerCase().includes(q) ||
          (r.patient.room_number ?? "").toLowerCase().includes(q),
      )
      .sort((a, b) => {
        // active first, then by urgency (overdue appt > soon appt), then newest
        const aActive = a.activeVisit ? 1 : 0;
        const bActive = b.activeVisit ? 1 : 0;
        if (aActive !== bActive) return bActive - aActive;
        const at = a.nextAppointment ? new Date(a.nextAppointment.scheduled_at).getTime() : Infinity;
        const bt = b.nextAppointment ? new Date(b.nextAppointment.scheduled_at).getTime() : Infinity;
        if (at !== bt) return at - bt;
        return new Date(b.patient.created_at).getTime() - new Date(a.patient.created_at).getTime();
      });
  }, [patients, visits, appointments, now, search, stageFilter]);

  // Track stage transitions and fire notifications.
  // Keyed by visit id so a new admission for a returning patient still triggers.
  const prevStagesRef = useRef<Map<string, Stage> | null>(null);
  useEffect(() => {
    if (fetching) return;
    const current = new Map<string, Stage>();
    visits.forEach((v) => current.set(v.id, deriveStage(v)));

    const prev = prevStagesRef.current;
    if (prev) {
      const patientById: Record<string, Patient> = {};
      patients.forEach((p) => (patientById[p.id] = p));

      visits.forEach((v) => {
        const before = prev.get(v.id);
        const after = current.get(v.id);
        if (!before || !after || before === after) return;

        const p = patientById[v.patient_id];
        const who = p
          ? `${p.name}${p.room_number ? ` (Rm ${p.room_number})` : ""}`
          : "Patient";

        // Waiting -> Under Care (or Awaiting Labs, which is also "now being seen")
        const wasWaiting = before === "in_triage";
        const nowUnderCare = after === "under_care" || after === "awaiting_labs";
        if (wasWaiting && nowUnderCare) {
          toast.success(`${who} is now ${STAGE_META[after].label}`, {
            description: "Transitioned from Waiting (In Triage) to active care.",
            duration: 8_000,
          });
          return;
        }

        // Under Care -> Ready for Discharge
        const wasUnderCare = before === "under_care" || before === "awaiting_labs";
        const nowReady = after === "ready_for_discharge";
        if (wasUnderCare && nowReady) {
          toast(`${who} is Ready for Discharge`, {
            description: "Documentation complete — ready to discharge.",
            duration: 10_000,
          });
        }
      });
    }
    prevStagesRef.current = current;
  }, [visits, patients, fetching]);

  const stats = useMemo(() => {
    const active = rows.filter((r) => r.stage !== "discharged");
    const byStage = (s: Stage) => active.filter((r) => r.stage === s).length;
    const overdueAppts = rows.filter(
      (r) => r.nextAppointment && new Date(r.nextAppointment.scheduled_at).getTime() < now,
    ).length;
    return {
      total: patients.length,
      active: active.length,
      triage: byStage("in_triage"),
      ready: byStage("ready_for_discharge"),
      overdueAppts,
    };
  }, [rows, patients.length, now]);

  if (loading || fetching) {
    return (
      <StaffShell title="Home Dashboard">
        <div className="mx-auto max-w-7xl space-y-6 p-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </StaffShell>
    );
  }

  const stageFilters: { key: typeof stageFilter; label: string }[] = [
    { key: "active", label: "Active" },
    { key: "in_triage", label: "In Triage" },
    { key: "awaiting_labs", label: "Awaiting Labs" },
    { key: "under_care", label: "Under Care" },
    { key: "ready_for_discharge", label: "Ready for Discharge" },
    { key: "all", label: "All" },
  ];

  return (
    <StaffShell title="Home Dashboard">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <div>
          <h2 className="font-heading text-2xl font-semibold tracking-tight">
            Welcome{displayName ? `, ${displayName}` : ""}
          </h2>
          <p className="text-sm text-muted-foreground">
            {roles.join(", ") || "staff"} · {user?.email}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatCard icon={<Users className="h-4 w-4" />} label="Total Patients" value={stats.total} tone="muted" />
          <StatCard icon={<Activity className="h-4 w-4" />} label="Active" value={stats.active} tone="muted" />
          <StatCard icon={<Siren className="h-4 w-4" />} label="In Triage" value={stats.triage} tone="amber" />
          <StatCard icon={<ClipboardList className="h-4 w-4" />} label="Ready for Discharge" value={stats.ready} tone="green" />
          <StatCard icon={<CalendarClock className="h-4 w-4" />} label="Overdue Appts" value={stats.overdueAppts} tone="red" />
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by patient or room..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {stageFilters.map((f) => (
              <button
                key={f.key}
                onClick={() => setStageFilter(f.key)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  stageFilter === f.key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-muted",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Patient cards */}
        {rows.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No patients match the current filter.{" "}
              <Link to="/staff/admit" className="text-primary underline">
                Admit a patient
              </Link>{" "}
              to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((r, i) => (
              <div
                key={r.patient.id}
                className="animate-fade-in"
                style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
              >
                <PatientCard row={r} now={now} />
              </div>
            ))}
          </div>
        )}
      </div>
    </StaffShell>
  );
}

function PatientCard({ row, now }: { row: Row; now: number }) {
  const meta = STAGE_META[row.stage];
  const countdown = fmtCountdown(row.nextAppointment?.scheduled_at ?? null, now);
  const countdownCls =
    countdown.tone === "overdue"
      ? "text-destructive"
      : countdown.tone === "soon"
        ? "text-amber-600 dark:text-amber-400"
        : "text-foreground";

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate text-base">{row.patient.name}</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {row.patient.age}y · {row.patient.gender ?? "—"}
              {row.patient.room_number && (
                <>
                  {" · "}
                  <span className="font-medium text-foreground">Rm {row.patient.room_number}</span>
                </>
              )}
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
              meta.cls,
            )}
          >
            {meta.label}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {/* Treatment progress */}
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground">Treatment Status</span>
            <span className="font-semibold tabular-nums">{row.progress}%</span>
          </div>
          <Progress value={row.progress} className="h-2" />
        </div>

        {/* Appointment + last seen */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-border bg-muted/30 p-2.5">
            <div className="mb-1 flex items-center gap-1 text-muted-foreground">
              <CalendarClock className="h-3 w-3" /> Next appointment
            </div>
            <div className={cn("font-semibold tabular-nums", countdownCls)}>{countdown.label}</div>
            {row.nextAppointment?.reason && (
              <div className="mt-0.5 truncate text-muted-foreground">{row.nextAppointment.reason}</div>
            )}
          </div>
          <div className="rounded-md border border-border bg-muted/30 p-2.5">
            <div className="mb-1 flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" /> Last seen
            </div>
            <div className="font-semibold tabular-nums">{fmtAgo(row.minutesSinceLast)}</div>
            {row.activeVisit?.acuity_score != null && (
              <div className="mt-0.5 text-muted-foreground">Acuity {row.activeVisit.acuity_score}</div>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button asChild size="sm" variant="outline" className="flex-1">
            <Link to="/patient/profile/$patientId" params={{ patientId: row.patient.id }}>
              Open profile
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "muted" | "red" | "amber" | "green";
}) {
  const toneCls = {
    muted: "border-border bg-card",
    red: "border-destructive/40 bg-destructive/5 text-destructive",
    amber: "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400",
    green: "border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400",
  }[tone];
  return (
    <div className={cn("flex items-center justify-between rounded-xl border p-4", toneCls)}>
      <div className="min-w-0">
        <div className="truncate text-[11px] uppercase tracking-wide opacity-80">{label}</div>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
      </div>
      <div className="opacity-70">{icon}</div>
    </div>
  );
}
