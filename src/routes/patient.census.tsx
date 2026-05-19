import { useEffect, useMemo, useState, useCallback } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { generateShiftHandoff } from "@/lib/handoff.functions";
import { cn } from "@/lib/utils";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileText,
  Search,
  Settings2,
  Siren,
  Plus,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/patient/census")({
  component: CensusPage,
  head: () => ({
    meta: [
      { title: "Patient Census — PatientTracker" },
      {
        name: "description",
        content:
          "Real-time patient census with AI acuity scoring, rounding timers, and escalation alerts.",
      },
    ],
  }),
});

// ---------- Types ----------
type Visit = {
  id: string;
  patient_id: string;
  admission_time: string;
  last_interaction_at: string | null;
  acuity_score: number | null;
  heart_rate: number | null;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  spo2: number | null;
};

type Patient = {
  id: string;
  name: string;
  age: number;
  gender: string | null;
  room_number: string | null;
};

type Symptom = { patient_id: string; description: string; severity: string | null };
type History = { patient_id: string; condition: string; notes: string | null };

type Row = {
  visit: Visit;
  patient: Patient;
  symptoms: Symptom[];
  history: History[];
  acuity: number;
  minutesSince: number;
  status: "green" | "amber" | "red";
  threshold: number;
  isIcu: boolean;
};

// ---------- AI scoring ----------
function computeAcuity(
  visit: Visit,
  symptoms: Symptom[],
  history: History[],
): number {
  let score = 3;
  // vitals
  if (visit.heart_rate) {
    if (visit.heart_rate > 120 || visit.heart_rate < 50) score += 3;
    else if (visit.heart_rate > 100 || visit.heart_rate < 60) score += 1;
  }
  if (visit.systolic_bp) {
    if (visit.systolic_bp > 180 || visit.systolic_bp < 90) score += 3;
    else if (visit.systolic_bp > 160 || visit.systolic_bp < 100) score += 1;
  }
  if (visit.spo2 !== null) {
    if (visit.spo2 < 90) score += 4;
    else if (visit.spo2 < 94) score += 2;
  }
  // symptom keywords
  const sx = symptoms.map((s) => `${s.description} ${s.severity ?? ""}`.toLowerCase()).join(" ");
  const critical = ["chest pain", "shortness of breath", "stroke", "unconscious", "bleeding", "seizure", "severe"];
  const moderate = ["fever", "vomit", "headache", "dizzy", "nausea"];
  if (critical.some((k) => sx.includes(k))) score += 3;
  else if (moderate.some((k) => sx.includes(k))) score += 1;
  if (sx.includes("severe") || sx.includes("acute")) score += 1;
  // history risk
  const hx = history.map((h) => h.condition.toLowerCase()).join(" ");
  const chronic = ["diabetes", "copd", "heart", "cardiac", "renal", "cancer", "stroke", "hypertension"];
  if (chronic.some((k) => hx.includes(k))) score += 1;

  return Math.max(1, Math.min(10, Math.round(score)));
}

function statusFromMinutes(minutes: number, threshold: number): "green" | "amber" | "red" {
  if (minutes >= threshold) return "red";
  if (minutes >= threshold / 2) return "amber";
  return "green";
}

function effectiveThreshold(acuity: number, baseThreshold: number, icuThreshold: number): number {
  // High acuity (ICU-level) gets tighter threshold
  return acuity >= 7 ? icuThreshold : baseThreshold;
}

// ---------- Vitals simulation (Vigilant Watch style) ----------
function r(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
function seedVitals(v: Visit): Visit {
  // Only fill what's missing so we don't overwrite admitted-with values
  return {
    ...v,
    heart_rate: v.heart_rate ?? r(62, 105),
    systolic_bp: v.systolic_bp ?? r(108, 142),
    diastolic_bp: v.diastolic_bp ?? r(68, 88),
    spo2: v.spo2 ?? r(95, 100),
  };
}
function driftVitals(v: Visit): Visit {
  const acuity = v.acuity_score ?? 4;
  // higher acuity → larger drift, slight downward bias on SpO2
  const k = 1 + acuity / 5;
  const hr = clamp((v.heart_rate ?? 80) + Math.round((Math.random() - 0.45) * 6 * k), 38, 180);
  const sys = clamp((v.systolic_bp ?? 120) + Math.round((Math.random() - 0.5) * 5 * k), 70, 210);
  const dia = clamp((v.diastolic_bp ?? 78) + Math.round((Math.random() - 0.5) * 3 * k), 40, 130);
  const spo2Bias = acuity >= 7 ? 0.6 : 0.5;
  const spo2 = clamp((v.spo2 ?? 98) + Math.round((Math.random() - spo2Bias) * 2), 80, 100);
  return { ...v, heart_rate: hr, systolic_bp: sys, diastolic_bp: dia, spo2 };
}

function formatDuration(min: number) {
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}m ago`;
}

// ---------- Page ----------
function CensusPage() {
  const navigate = useNavigate();
  const { isAuthenticated, hasAnyRole, loading, signOut, displayName, user, roles, session } = useAuth();

  const [visits, setVisits] = useState<Visit[]>([]);
  const [patients, setPatients] = useState<Record<string, Patient>>({});
  const [symptoms, setSymptoms] = useState<Record<string, Symptom[]>>({});
  const [histories, setHistories] = useState<Record<string, History[]>>({});
  const [escalatedVisitIds, setEscalatedVisitIds] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(() => Date.now());
  const [search, setSearch] = useState("");
  const [threshold, setThreshold] = useState<number>(() => {
    if (typeof window === "undefined") return 240;
    const v = window.localStorage.getItem("rounding_threshold_minutes");
    return v ? Number(v) : 240; // standard: amber 2h, red 4h
  });
  const [icuThreshold, setIcuThreshold] = useState<number>(() => {
    if (typeof window === "undefined") return 60;
    const v = window.localStorage.getItem("icu_threshold_minutes");
    return v ? Number(v) : 60; // ICU/high-acuity: amber 30m, red 60m
  });
  const [showSettings, setShowSettings] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [handoffLoading, setHandoffLoading] = useState(false);
  const [handoffText, setHandoffText] = useState<string>("");
  const handoffFn = useServerFn(generateShiftHandoff);

  const isNurse = roles.includes("nurse");

  // auth gate
  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated || !hasAnyRole()) navigate({ to: "/staff/login" });
  }, [loading, isAuthenticated, hasAnyRole, navigate]);

  // persist thresholds
  useEffect(() => {
    window.localStorage.setItem("rounding_threshold_minutes", String(threshold));
    window.localStorage.setItem("icu_threshold_minutes", String(icuThreshold));
  }, [threshold, icuThreshold]);

  // tick every 15s
  // tick clock every 15s; drift simulated vitals every 6s
  useEffect(() => {
    const clockId = window.setInterval(() => setNow(Date.now()), 15_000);
    const driftId = window.setInterval(() => {
      setVisits((prev) => prev.map(driftVitals));
    }, 6_000);
    return () => {
      window.clearInterval(clockId);
      window.clearInterval(driftId);
    };
  }, []);

  const loadData = useCallback(async () => {
    const { data: vs } = await supabase
      .from("visits")
      .select("id, patient_id, admission_time, last_interaction_at, acuity_score, heart_rate, systolic_bp, diastolic_bp, spo2")
      .is("completed_time", null)
      .order("admission_time", { ascending: false });
    const visitRows = ((vs ?? []) as Visit[]).map(seedVitals);
    setVisits(visitRows);

    const ids = Array.from(new Set(visitRows.map((v) => v.patient_id)));
    if (ids.length === 0) {
      setPatients({});
      setSymptoms({});
      setHistories({});
      setFetching(false);
      return;
    }
    const [{ data: ps }, { data: sx }, { data: hx }] = await Promise.all([
      supabase.from("patients").select("id, name, age, gender, room_number").in("id", ids),
      supabase.from("symptoms").select("patient_id, description, severity").in("patient_id", ids),
      supabase.from("medical_history").select("patient_id, condition, notes").in("patient_id", ids),
    ]);
    const pmap: Record<string, Patient> = {};
    (ps ?? []).forEach((p) => (pmap[p.id] = p as Patient));
    setPatients(pmap);
    const smap: Record<string, Symptom[]> = {};
    (sx ?? []).forEach((s) => {
      const row = s as Symptom;
      (smap[row.patient_id] ||= []).push(row);
    });
    setSymptoms(smap);
    const hmap: Record<string, History[]> = {};
    (hx ?? []).forEach((h) => {
      const row = h as History;
      (hmap[row.patient_id] ||= []).push(row);
    });
    setHistories(hmap);
    setFetching(false);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !hasAnyRole()) return;
    loadData();
    const id = window.setInterval(loadData, 60_000);
    return () => window.clearInterval(id);
  }, [isAuthenticated, hasAnyRole, loadData]);

  // build rows + acuity + status
  const rows: Row[] = useMemo(() => {
    return visits
      .filter((v) => patients[v.patient_id])
      .map((v) => {
        const sxs = symptoms[v.patient_id] ?? [];
        const hxs = histories[v.patient_id] ?? [];
        const acuity = v.acuity_score ?? computeAcuity(v, sxs, hxs);
        const ref = v.last_interaction_at ?? v.admission_time;
        const minutesSince = Math.max(0, Math.floor((now - new Date(ref).getTime()) / 60_000));
        const isIcu = acuity >= 7;
        const rowThreshold = effectiveThreshold(acuity, threshold, icuThreshold);
        const status = statusFromMinutes(minutesSince, rowThreshold);
        return {
          visit: v,
          patient: patients[v.patient_id],
          symptoms: sxs,
          history: hxs,
          acuity,
          minutesSince,
          status,
          threshold: rowThreshold,
          isIcu,
        };
      })
      .filter((r) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          r.patient.name.toLowerCase().includes(q) ||
          (r.patient.room_number ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        // group by room first for the live board feel
        const w = { red: 2, amber: 1, green: 0 } as const;
        if (w[a.status] !== w[b.status]) return w[b.status] - w[a.status];
        const aOver = a.minutesSince - a.threshold;
        const bOver = b.minutesSince - b.threshold;
        if (aOver !== bOver) return bOver - aOver;
        if (a.acuity !== b.acuity) return b.acuity - a.acuity;
        const ar = a.patient.room_number ?? "";
        const br = b.patient.room_number ?? "";
        return ar.localeCompare(br, undefined, { numeric: true });
      });
  }, [visits, patients, symptoms, histories, now, threshold, icuThreshold, search]);

  // auto-escalate on threshold breach (once per visit per session)
  useEffect(() => {
    const breached = rows.filter(
      (r) => r.status === "red" && !escalatedVisitIds.has(r.visit.id),
    );
    if (breached.length === 0) return;

    const newIds = new Set(escalatedVisitIds);
    breached.forEach((r) => newIds.add(r.visit.id));
    setEscalatedVisitIds(newIds);

    (async () => {
      const inserts = breached.map((r) => ({
        patient_id: r.patient.id,
        visit_id: r.visit.id,
        minutes_since_last_interaction: r.minutesSince,
        acuity_score: r.acuity,
        reason: "rounding_threshold_exceeded",
      }));
      const { error } = await supabase.from("escalation_history").insert(inserts);
      if (!error) {
        breached.forEach((r) => {
          toast.error(
            `🚨 Escalation: ${r.patient.name}${r.patient.room_number ? ` (Rm ${r.patient.room_number})` : ""} overdue ${r.minutesSince}m`,
            {
              description: isNurse
                ? "High-priority alert assigned to you (Charge Nurse)."
                : "Charge Nurse has been alerted.",
              duration: 10_000,
            },
          );
        });
      }
    })();
  }, [rows, escalatedVisitIds, isNurse]);

  const quickLog = async (row: Row) => {
    const ts = new Date().toISOString();
    const [{ error: vErr }, { error: iErr }] = await Promise.all([
      supabase
        .from("visits")
        .update({ last_interaction_at: ts })
        .eq("id", row.visit.id),
      supabase.from("patient_interactions").insert({
        patient_id: row.patient.id,
        visit_id: row.visit.id,
        logged_by: user?.id ?? null,
        note: "Quick log: rounding assessment completed",
        logged_at: ts,
      }),
    ]);
    if (vErr || iErr) {
      toast.error("Failed to log interaction");
      return;
    }
    setVisits((prev) =>
      prev.map((v) => (v.id === row.visit.id ? { ...v, last_interaction_at: ts } : v)),
    );
    setEscalatedVisitIds((prev) => {
      const n = new Set(prev);
      n.delete(row.visit.id);
      return n;
    });
    toast.success(`Assessment logged for ${row.patient.name}`);
  };

  if (loading || fetching) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const counts = {
    total: rows.length,
    red: rows.filter((r) => r.status === "red").length,
    amber: rows.filter((r) => r.status === "amber").length,
    green: rows.filter((r) => r.status === "green").length,
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <h1 className="font-heading text-xl font-semibold">Patient Census</h1>
            <p className="text-sm text-muted-foreground">
              {displayName || user?.email} · {roles.join(", ") || "staff"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/staff/dashboard">Dashboard</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/staff/admit">
                <Plus className="mr-1 h-4 w-4" /> Admit
              </Link>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={async () => {
                setHandoffOpen(true);
                setHandoffLoading(true);
                setHandoffText("");
                try {
                  if (!session?.access_token) {
                    toast.error("Please sign in again before generating handoff");
                    setHandoffText("Please sign in again before generating a shift handoff.");
                    return;
                  }
                  const res = await handoffFn({
                    headers: { Authorization: `Bearer ${session.access_token}` },
                  });
                  if (res.error) toast.warning("Using fallback handoff summary");
                  setHandoffText(res.handoff);
                } catch (e) {
                  console.error("Failed to generate handoff", e);
                  toast.error("Failed to generate handoff");
                  setHandoffText("Error generating handoff. Please try again.");
                } finally {
                  setHandoffLoading(false);
                }
              }}
            >
              <FileText className="mr-1 h-4 w-4" /> Shift Handoff
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowSettings((s) => !s)}>
              <Settings2 className="mr-1 h-4 w-4" /> Settings
            </Button>
            <Button variant="outline" size="sm" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>
        {showSettings && (
          <div className="border-t border-border bg-muted/30">
            <div className="mx-auto max-w-7xl px-4 py-3">
              <div className="flex flex-wrap items-end gap-6">
                <div className="space-y-1">
                  <Label htmlFor="threshold" className="text-xs">
                    Standard threshold (min)
                  </Label>
                  <Input
                    id="threshold"
                    type="number"
                    min={5}
                    max={720}
                    value={threshold}
                    onChange={(e) => setThreshold(Math.max(5, Number(e.target.value) || 240))}
                    className="w-32"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Amber &gt; {Math.floor(threshold / 2)}m · Red &gt; {threshold}m
                  </p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="icu-threshold" className="text-xs">
                    ICU / high-acuity threshold (min)
                  </Label>
                  <Input
                    id="icu-threshold"
                    type="number"
                    min={5}
                    max={240}
                    value={icuThreshold}
                    onChange={(e) => setIcuThreshold(Math.max(5, Number(e.target.value) || 60))}
                    className="w-32"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Applied to acuity ≥ 7. Amber &gt; {Math.floor(icuThreshold / 2)}m · Red &gt; {icuThreshold}m
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard icon={<Activity className="h-4 w-4" />} label="On Census" value={counts.total} tone="muted" />
          <StatCard icon={<Siren className="h-4 w-4" />} label="Critical" value={counts.red} tone="red" />
          <StatCard icon={<Clock className="h-4 w-4" />} label="Amber" value={counts.amber} tone="amber" />
          <StatCard icon={<ClipboardCheck className="h-4 w-4" />} label="Green" value={counts.green} tone="green" />
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by patient name or room..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Cards */}
        {rows.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No active patients. <Link to="/staff/admit" className="text-primary underline">Admit a patient</Link> to populate the census.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((r) => (
              <PatientCard key={r.visit.id} row={r} onQuickLog={() => quickLog(r)} />
            ))}
          </div>
        )}
      </main>

      <Dialog open={handoffOpen} onOpenChange={setHandoffOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> AI Shift Handoff Brief
            </DialogTitle>
            <DialogDescription>
              Review the generated shift summary before sign-off.
            </DialogDescription>
          </DialogHeader>
          {handoffLoading ? (
            <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm">Generating handoff from live census…</p>
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed">
              {handoffText}
            </div>
          )}
          {!handoffLoading && handoffText && (
            <div className="flex justify-end gap-2 border-t pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(handoffText);
                  toast.success("Handoff copied to clipboard");
                }}
              >
                Copy
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  toast.success(`Handoff signed off by ${displayName || user?.email}`);
                  setHandoffOpen(false);
                }}
              >
                <CheckCircle2 className="mr-1 h-4 w-4" /> Sign off
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
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
      <div>
        <div className="text-xs uppercase tracking-wide opacity-80">{label}</div>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
      </div>
      <div className="opacity-70">{icon}</div>
    </div>
  );
}

function PatientCard({
  row,
  onQuickLog,
}: {
  row: Row;
  onQuickLog: () => void;
}) {
  const { patient, visit, acuity, minutesSince, status, symptoms, history, threshold, isIcu } = row;
  const remaining = threshold - minutesSince;
  const pct = Math.min(100, Math.round((minutesSince / threshold) * 100));

  const borderCls =
    status === "red"
      ? "border-destructive ring-2 ring-destructive/40 animate-pulse"
      : status === "amber"
        ? "border-amber-500/60"
        : "border-emerald-500/60";

  const dotCls =
    status === "red"
      ? "bg-destructive"
      : status === "amber"
        ? "bg-amber-500"
        : "bg-emerald-500";

  const barCls =
    status === "red" ? "bg-destructive" : status === "amber" ? "bg-amber-500" : "bg-emerald-500";

  const acuityCls =
    acuity >= 8
      ? "bg-destructive text-destructive-foreground"
      : acuity >= 5
        ? "bg-amber-500 text-black"
        : "bg-emerald-500 text-black";

  return (
    <Card className={cn("border-2 transition-shadow", borderCls)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate text-base">{patient.name}</CardTitle>
            <div className="mt-1 text-xs text-muted-foreground">
              {patient.age}y · {patient.gender ?? "—"}
              {patient.room_number ? ` · Rm ${patient.room_number}` : ""}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span
              className={cn(
                "rounded-md px-2 py-0.5 text-xs font-bold tabular-nums",
                acuityCls,
              )}
              title="AI acuity score (1–10)"
            >
              ACUITY {acuity}
            </span>
            {isIcu && (
              <span className="inline-flex items-center rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary">
                ICU
              </span>
            )}
            {status === "red" && (
              <span className="inline-flex items-center gap-1 rounded-md bg-destructive px-1.5 py-0.5 text-[10px] font-semibold uppercase text-destructive-foreground">
                <AlertTriangle className="h-3 w-3" /> Critical
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className={cn("h-2 w-2 rounded-full", dotCls)} />
              Last assessment {formatDuration(minutesSince)}
            </span>
            <span className={cn("font-medium tabular-nums", status === "red" ? "text-destructive" : "")}>
              {remaining > 0 ? `${remaining}m left` : `${Math.abs(remaining)}m overdue`}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className={cn("h-full transition-all", barCls)} style={{ width: `${pct}%` }} />
          </div>
        </div>

        {symptoms.length > 0 && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Sx:</span>{" "}
            {symptoms.map((s) => s.description).join("; ")}
          </p>
        )}
        {history.length > 0 && (
          <p className="line-clamp-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Hx:</span>{" "}
            {history.map((h) => h.condition).join(", ")}
          </p>
        )}
        {visit.heart_rate || visit.systolic_bp || visit.spo2 ? (
          <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
            {visit.heart_rate ? <span>HR {visit.heart_rate}</span> : null}
            {visit.systolic_bp ? (
              <span>
                BP {visit.systolic_bp}/{visit.diastolic_bp ?? "—"}
              </span>
            ) : null}
            {visit.spo2 ? <span>SpO₂ {visit.spo2}%</span> : null}
          </div>
        ) : null}

        <Button
          onClick={onQuickLog}
          size="sm"
          className="w-full"
          variant={status === "red" ? "destructive" : "default"}
        >
          <CheckCircle2 className="mr-1 h-4 w-4" /> Mark Seen
        </Button>
      </CardContent>
    </Card>
  );
}
