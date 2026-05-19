import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { ClipboardPlus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {StaffShell} from "@/components/StaffShell";
import { title } from "process";

export const Route = createFileRoute("/staff/admit")({
  component: PatientAdmissionPage,
  head: () => ({
    meta: [
      { title: "Patient Admission — PatientTracker" },
      { name: "description", content: "Admit a new patient: name, gender, age, medical history, current symptoms." },
    ],
  }),
});

function PatientAdmissionPage() {
  const navigate = useNavigate();
  const { isAuthenticated, hasAnyRole, loading, signOut, displayName, user, roles } = useAuth();

  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [medicalHistory, setMedicalHistory] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) navigate({ to: "/staff/login" });
    else if (!hasAnyRole()) navigate({ to: "/staff/login" });
  }, [loading, isAuthenticated, hasAnyRole, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { data: patient, error: pErr } = await supabase
        .from("patients")
        .insert({ name: fullName, gender, age: Number(age) })
        .select("id")
        .single();
      if (pErr) throw pErr;

      const inserts: PromiseLike<unknown>[] = [];
      if (medicalHistory.trim()) {
        inserts.push(
          supabase.from("medical_history").insert({
            patient_id: patient.id,
            condition: medicalHistory.trim().slice(0, 200),
            notes: medicalHistory.trim(),
          })
        );
      }
      if (symptoms.trim()) {
        inserts.push(
          supabase.from("symptoms").insert({
            patient_id: patient.id,
            description: symptoms.trim(),
          })
        );
      }
      // create initial visit so they appear on the census
      inserts.push(
        supabase.from("visits").insert({
          patient_id: patient.id,
          status_id: 1,
          last_interaction_at: new Date().toISOString(),
        })
      );
      await Promise.all(inserts);

      // Reset form after successful admission
      setFullName("");
      setGender("");
      setAge("");
      setMedicalHistory("");
      setSymptoms("");
      setSuccess(`Patient ${fullName} admitted successfully.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to admit patient");
    } finally {
      setSubmitting(false);
    }
  };





  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="font-heading text-xl font-semibold">Patient Admission</h1>
            {loading ? (
              <Skeleton className="mt-1 h-4 w-48" />
            ) : (
              <p className="text-sm text-muted-foreground">
                {displayName || user?.email} · {roles.join(", ") || "staff"}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
          <Link to="/staff/dashboard">
            <Button variant="outline" size="sm" disabled={loading}>
              Dashboard
            </Button>
          </Link>
            <Button variant="outline" size="sm" onClick={signOut} disabled={loading}>Sign out</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <ClipboardPlus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>New Patient Admission</CardTitle>
                <CardDescription>Complete the form to admit a patient and view them on the census.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4" aria-busy="true" aria-label="Loading admission form">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-9 w-full" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-20 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-20 w-full" />
                </div>
                <div className="flex justify-end pt-2">
                  <Skeleton className="h-9 w-32" />
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Input id="gender" value={gender} onChange={(e) => setGender(e.target.value)} placeholder="e.g. Female" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="age">Age</Label>
                    <Input id="age" type="number" min={0} max={150} value={age} onChange={(e) => setAge(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="history">Medical History</Label>
                  <Textarea id="history" rows={3} value={medicalHistory} onChange={(e) => setMedicalHistory(e.target.value)} placeholder="Past conditions, surgeries, chronic illnesses..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="symptoms">Current Symptoms</Label>
                  <Textarea id="symptoms" rows={3} value={symptoms} onChange={(e) => setSymptoms(e.target.value)} placeholder="Reason for admission, presenting symptoms..." required />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                {success && <p className="text-sm text-primary">{success}</p>}
                <div className="flex flex-wrap justify-end gap-2 pt-2">
                  {success && (
                    <Button asChild type="button" variant="outline">
                      <Link to="/staff/dashboard">Home Dashboard</Link>
                    </Button>
                  )}
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Admitting..." : "Admit patient"}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

