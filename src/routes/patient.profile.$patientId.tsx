import { useEffect, useMemo, useState, useCallback } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { StaffShell } from "@/components/StaffShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { HealthRecordEditor } from "@/components/HealthRecordEditor";
import { ScheduleAppointmentDialog } from "@/components/ScheduleAppointmentDialog";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Search, AlertTriangle, Pill, Stethoscope, Activity, Mail, Pencil, Check, X, Send, CheckCircle2, AlertCircle, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/patient/profile/$patientId")({
  component: PatientProfilePage,
  head: () => ({
    meta: [
      { title: "Patient Health Profile — PatientTracker" },
      { name: "description", content: "Manage patient medications, allergies, symptoms, and history." },
    ],
  }),
});

type Patient = {
  id: string;
  name: string;
  age: number;
  gender: string | null;
  room_number: string | null;
  email: string | null;
};

type Row = { id: string } & Record<string, unknown>;

function PatientProfilePage() {
  const { patientId } = Route.useParams();
  const navigate = useNavigate();
  const { isAuthenticated, hasAnyRole, loading } = useAuth();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [symptoms, setSymptoms] = useState<Row[]>([]);
  const [allergies, setAllergies] = useState<Row[]>([]);
  const [medicines, setMedicines] = useState<Row[]>([]);
  const [history, setHistory] = useState<Row[]>([]);
  const [fetching, setFetching] = useState(true);
  const [symptomQuery, setSymptomQuery] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated || !hasAnyRole()) navigate({ to: "/staff/login" });
  }, [loading, isAuthenticated, hasAnyRole, navigate]);

  const load = useCallback(async () => {
    const [pat, sym, all, med, hist] = await Promise.all([
      supabase.from("patients").select("id, name, age, gender, room_number, email").eq("id", patientId).maybeSingle(),
      supabase.from("symptoms").select("id, description, severity, reported_on, notes").eq("patient_id", patientId).order("reported_on", { ascending: false }),
      supabase.from("allergies").select("id, allergen, reaction, severity, notes").eq("patient_id", patientId),
      supabase.from("medicines").select("id, name, dosage, frequency, started_on, ended_on, notes").eq("patient_id", patientId).order("started_on", { ascending: false, nullsFirst: false }),
      supabase.from("medical_history").select("id, condition, diagnosed_on, notes").eq("patient_id", patientId).order("diagnosed_on", { ascending: false, nullsFirst: false }),
    ]);
    setPatient((pat.data as Patient) ?? null);
    setSymptoms((sym.data ?? []) as Row[]);
    setAllergies((all.data ?? []) as Row[]);
    setMedicines((med.data ?? []) as Row[]);
    setHistory((hist.data ?? []) as Row[]);
    setFetching(false);
  }, [patientId]);

  useEffect(() => {
    if (!isAuthenticated || !hasAnyRole()) return;
    load();
  }, [isAuthenticated, hasAnyRole, load]);

  const filteredSymptoms = useMemo(() => {
    const q = symptomQuery.trim().toLowerCase();
    if (!q) return symptoms;
    return symptoms.filter((s) =>
      [s.description, s.severity, s.notes]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [symptoms, symptomQuery]);

  if (loading || fetching) {
    return (
      <StaffShell title="Patient Profile">
        <div className="mx-auto max-w-5xl space-y-4 p-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
      </StaffShell>
    );
  }

  if (!patient) {
    return (
      <StaffShell title="Patient Profile">
        <div className="mx-auto max-w-3xl p-6 text-center">
          <p className="text-sm text-muted-foreground">Patient not found.</p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link to="/staff/dashboard"><ArrowLeft className="mr-1 h-4 w-4" /> Back to dashboard</Link>
          </Button>
        </div>
      </StaffShell>
    );
  }

  return (
    <StaffShell title="Patient Profile">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 animate-fade-in">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/staff/dashboard"><ArrowLeft className="mr-1 h-4 w-4" /> Dashboard</Link>
          </Button>
          <div className="flex items-center gap-2">
            <ScheduleAppointmentDialog
              patientId={patient.id}
              patientName={patient.name}
              patientEmail={patient.email}
              onScheduled={load}
            />
            <DeletePatientButton patientId={patient.id} patientName={patient.name} onDeleted={() => navigate({ to: "/staff/dashboard" })} />
          </div>
        </div>

        {/* Patient header card */}
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card">
          <CardContent className="flex flex-wrap items-center gap-4 p-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-xl font-semibold text-primary">
              {patient.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-heading text-2xl font-semibold tracking-tight">{patient.name}</h2>
              <p className="text-sm text-muted-foreground">
                {patient.age}y · {patient.gender ?? "—"}
                {patient.room_number ? ` · Rm ${patient.room_number}` : ""}
              </p>
              <EmailEditor
                patientId={patient.id}
                email={patient.email}
                onSaved={(newEmail) => setPatient((p) => (p ? { ...p, email: newEmail } : p))}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Stat label="Allergies" value={allergies.length} tone="amber" icon={<AlertTriangle className="h-3.5 w-3.5" />} />
              <Stat label="Medications" value={medicines.length} tone="sky" icon={<Pill className="h-3.5 w-3.5" />} />
              <Stat label="Symptoms" value={symptoms.length} tone="teal" icon={<Activity className="h-3.5 w-3.5" />} />
              <Stat label="History" value={history.length} tone="muted" icon={<Stethoscope className="h-3.5 w-3.5" />} />
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="symptoms" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="symptoms">Symptoms</TabsTrigger>
            <TabsTrigger value="medications">Medications</TabsTrigger>
            <TabsTrigger value="allergies">Allergies</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="symptoms" className="mt-4 animate-fade-in">
            <div className="mb-3 relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search symptoms by description, severity..."
                value={symptomQuery}
                onChange={(e) => setSymptomQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <HealthRecordEditor
              title="Symptom Tracker"
              table="symptoms"
              patientId={patient.id}
              rows={filteredSymptoms as never}
              onChange={load}
              primaryKey="description"
              secondaryKeys={["severity", "reported_on", "notes"]}
              emptyMessage={symptomQuery ? "No symptoms match your search." : "No symptoms recorded yet."}
              fields={[
                { name: "description", label: "Description", required: true },
                { name: "severity", label: "Severity (mild/moderate/severe)" },
                { name: "reported_on", label: "Reported on", type: "date" },
                { name: "notes", label: "Notes", type: "textarea" },
              ]}
            />
          </TabsContent>

          <TabsContent value="medications" className="mt-4 animate-fade-in">
            <HealthRecordEditor
              title="Medications"
              table="medicines"
              patientId={patient.id}
              rows={medicines as never}
              onChange={load}
              primaryKey="name"
              secondaryKeys={["dosage", "frequency", "started_on"]}
              emptyMessage="No medications recorded."
              fields={[
                { name: "name", label: "Medication name", required: true },
                { name: "dosage", label: "Dosage" },
                { name: "frequency", label: "Frequency" },
                { name: "started_on", label: "Started on", type: "date" },
                { name: "ended_on", label: "Ended on", type: "date" },
                { name: "notes", label: "Notes", type: "textarea" },
              ]}
            />
          </TabsContent>

          <TabsContent value="allergies" className="mt-4 animate-fade-in">
            <HealthRecordEditor
              title="Allergies"
              table="allergies"
              patientId={patient.id}
              rows={allergies as never}
              onChange={load}
              primaryKey="allergen"
              secondaryKeys={["reaction", "severity"]}
              emptyMessage="No known allergies."
              fields={[
                { name: "allergen", label: "Allergen", required: true },
                { name: "reaction", label: "Reaction" },
                { name: "severity", label: "Severity" },
                { name: "notes", label: "Notes", type: "textarea" },
              ]}
            />
          </TabsContent>

          <TabsContent value="history" className="mt-4 animate-fade-in">
            <HealthRecordEditor
              title="Medical History"
              table="medical_history"
              patientId={patient.id}
              rows={history as never}
              onChange={load}
              primaryKey="condition"
              secondaryKeys={["diagnosed_on"]}
              emptyMessage="No medical history recorded."
              fields={[
                { name: "condition", label: "Condition", required: true },
                { name: "diagnosed_on", label: "Diagnosed on", type: "date" },
                { name: "notes", label: "Notes", type: "textarea" },
              ]}
            />
          </TabsContent>
        </Tabs>

        <EmailDeliveryStatus email={patient.email} />
      </div>
    </StaffShell>
  );
}

type EmailLogRow = {
  id: string;
  status: string;
  template_name: string;
  created_at: string;
  error_message: string | null;
  message_id: string | null;
};

function EmailDeliveryStatus({ email }: { email: string | null }) {
  const [rows, setRows] = useState<EmailLogRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!email) {
      setRows([]);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("email_send_log")
      .select("id, status, template_name, created_at, error_message, message_id")
      .eq("recipient_email", email)
      .eq("template_name", "appointment-scheduled")
      .order("created_at", { ascending: false })
      .limit(5);
    setRows((data ?? []) as EmailLogRow[]);
    setLoading(false);
  }, [email]);

  useEffect(() => {
    load();
  }, [load]);

  if (!email) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Send className="h-4 w-4" /> Appointment email delivery</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Add an email address to track appointment email delivery status.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><Send className="h-4 w-4" /> Appointment email delivery</CardTitle>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No appointment emails sent yet.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-3 rounded-md border p-3 text-sm">
                <div className="flex items-start gap-2 min-w-0">
                  <StatusIcon status={r.status} />
                  <div className="min-w-0">
                    <div className="font-medium capitalize">{r.status}</div>
                    <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
                    {r.error_message && (
                      <div className="text-xs text-destructive mt-1 break-words">{r.error_message}</div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "sent") return <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5" />;
  if (status === "pending") return <Clock className="h-4 w-4 text-amber-600 mt-0.5" />;
  return <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />;
}

function Stat({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: "amber" | "sky" | "teal" | "muted";
  icon: React.ReactNode;
}) {
  const cls = {
    amber: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
    sky: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
    teal: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30",
    muted: "bg-muted text-muted-foreground border-border",
  }[tone];
  return (
    <div className={cn("flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs", cls)}>
      {icon}
      <span className="font-semibold tabular-nums">{value}</span>
      <span className="opacity-80">{label}</span>
    </div>
  );
}

function EmailEditor({
  patientId,
  email,
  onSaved,
}: {
  patientId: string;
  email: string | null;
  onSaved: (email: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(email ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const next = value.trim() || null;
    if (next && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("patients").update({ email: next }).eq("id", patientId);
    setSaving(false);
    if (error) {
      toast.error("Failed to save email", { description: error.message });
      return;
    }
    onSaved(next);
    setEditing(false);
    toast.success(next ? "Email saved" : "Email cleared");
  };

  if (!editing) {
    return (
      <div className="mt-1 flex items-center gap-2 text-sm">
        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
        <span className={email ? "text-foreground" : "text-muted-foreground italic"}>
          {email ?? "No email on file"}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => {
            setValue(email ?? "");
            setEditing(true);
          }}
        >
          <Pencil className="mr-1 h-3 w-3" />
          {email ? "Edit" : "Add"}
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-1 flex items-center gap-2">
      <Input
        type="email"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="patient@example.com"
        className="h-8 max-w-xs"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") setEditing(false);
        }}
      />
      <Button type="button" size="sm" className="h-8" onClick={save} disabled={saving}>
        <Check className="h-3.5 w-3.5" />
      </Button>
      <Button type="button" size="sm" variant="ghost" className="h-8" onClick={() => setEditing(false)} disabled={saving}>
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function DeletePatientButton({
  patientId,
  patientName,
  onDeleted,
}: {
  patientId: string;
  patientName: string;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    // Remove child rows first (no FK cascade in schema)
    const childTables = [
      "symptoms",
      "allergies",
      "medicines",
      "medical_history",
      "appointments",
      "visits",
      "notifications",
      "patient_interactions",
      "escalation_history",
      "patient_accounts",
    ] as const;
    for (const table of childTables) {
      const { error } = await supabase.from(table).delete().eq("patient_id", patientId);
      if (error) {
        setDeleting(false);
        toast.error(`Failed to delete ${table}`, { description: error.message });
        return;
      }
    }
    const { error } = await supabase.from("patients").delete().eq("id", patientId);
    setDeleting(false);
    if (error) {
      toast.error("Failed to delete patient", { description: error.message });
      return;
    }
    toast.success(`${patientName} permanently deleted`);
    onDeleted();
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="mr-1 h-4 w-4" /> Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {patientName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes {patientName}'s profile and all related symptoms, allergies, medications, history, appointments, visits, and notifications. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
