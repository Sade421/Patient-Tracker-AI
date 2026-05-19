import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { sendTransactionalEmail } from "@/lib/email/send";

interface Props {
  patientId: string;
  patientName: string;
  patientEmail: string | null;
  onScheduled?: () => void;
}

export function ScheduleAppointmentDialog({ patientId, patientName, patientEmail, onScheduled }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState("30");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data: appt, error } = await supabase
        .from("appointments")
        .insert({
          patient_id: patientId,
          scheduled_at: new Date(scheduledAt).toISOString(),
          duration_minutes: Number(duration),
          reason: reason || null,
          notes: notes || null,
          scheduled_by: user?.id ?? null,
          status: "scheduled",
        })
        .select("id, scheduled_at")
        .single();
      if (error) throw error;

      const when = new Date(appt.scheduled_at).toLocaleString();

      // In-app notification
      await supabase.from("notifications").insert({
        patient_id: patientId,
        type: "appointment_scheduled",
        title: "New appointment scheduled",
        body: `You have an appointment on ${when}${reason ? ` — ${reason}` : ""}.`,
        link: "/patient/home",
        appointment_id: appt.id,
        created_by: user?.id ?? null,
      });

      // Email (best-effort; won't block on failure)
      if (patientEmail) {
        try {
          await sendTransactionalEmail({
            templateName: "appointment-scheduled",
            recipientEmail: patientEmail,
            idempotencyKey: `appt-${appt.id}`,
            templateData: {
              name: patientName,
              scheduledAt: when,
              durationMinutes: Number(duration),
              reason,
              notes,
            },
          });
        } catch (err) {
          console.warn("Email send failed (will still notify in-app):", err);
        }
      }

      toast.success("Appointment scheduled", {
        description: patientEmail ? `Notified ${patientName} in-app and by email.` : `Notified ${patientName} in-app. (No email on file.)`,
      });
      setOpen(false);
      setScheduledAt("");
      setReason("");
      setNotes("");
      onScheduled?.();
    } catch (err) {
      toast.error("Failed to schedule appointment", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Default min = now in local timezone
  const minDate = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <CalendarClock className="mr-1.5 h-4 w-4" />
          Schedule appointment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule appointment</DialogTitle>
          <DialogDescription>
            Notifies {patientName} in-app{patientEmail ? " and by email" : " (no email on file)"}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="scheduledAt">Date & time</Label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                min={minDate}
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (min)</Label>
              <Input id="duration" type="number" min={5} max={480} step={5} value={duration} onChange={(e) => setDuration(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Follow-up" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Bring previous lab results..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Scheduling..." : "Schedule & notify"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
