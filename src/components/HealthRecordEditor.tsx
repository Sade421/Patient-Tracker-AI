import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, X } from "lucide-react";

export type FieldDef = {
  name: string;
  label: string;
  type?: "text" | "date" | "textarea";
  required?: boolean;
};

type Row = Record<string, unknown> & { id: string };

interface Props {
  title: string;
  table: "medical_history" | "symptoms" | "medicines" | "allergies";
  patientId: string;
  fields: FieldDef[];
  rows: Row[];
  onChange: () => void;
  primaryKey: string; // field used as primary display
  secondaryKeys?: string[]; // fields shown as subtitle
  emptyMessage: string;
}

export function HealthRecordEditor({
  title, table, patientId, fields, rows, onChange,
  primaryKey, secondaryKeys = [], emptyMessage,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-heading text-foreground">{title}</CardTitle>
        {!adding && (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {adding && (
          <RecordForm
            fields={fields}
            onCancel={() => setAdding(false)}
            onSubmit={async (values) => {
              const payload = { ...values, patient_id: patientId } as never;
              const { error } = await supabase.from(table).insert(payload);
              if (error) { toast.error(error.message); return; }
              toast.success("Added");
              setAdding(false);
              onChange();
            }}
          />
        )}
        {rows.length === 0 && !adding ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((row) => (
              <li key={row.id} className="py-3">
                {editingId === row.id ? (
                  <RecordForm
                    fields={fields}
                    initial={row}
                    onCancel={() => setEditingId(null)}
                    onSubmit={async (values) => {
                      const { error } = await supabase.from(table).update(values as never).eq("id", row.id);
                      if (error) { toast.error(error.message); return; }
                      toast.success("Updated");
                      setEditingId(null);
                      onChange();
                    }}
                  />
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{String(row[primaryKey] ?? "—")}</p>
                      <p className="text-sm text-muted-foreground">
                        {secondaryKeys.map((k) => row[k]).filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setEditingId(row.id)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon" variant="ghost"
                        onClick={async () => {
                          if (!confirm("Delete this entry?")) return;
                          const { error } = await supabase.from(table).delete().eq("id", row.id);
                          if (error) { toast.error(error.message); return; }
                          toast.success("Deleted");
                          onChange();
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function RecordForm({
  fields, initial, onSubmit, onCancel,
}: {
  fields: FieldDef[];
  initial?: Record<string, unknown>;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {};
    for (const f of fields) {
      const v = initial?.[f.name];
      o[f.name] = v == null ? "" : String(v);
    }
    return o;
  });
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      className="space-y-3 rounded-md border border-border bg-background/40 p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setSubmitting(true);
        const cleaned: Record<string, unknown> = {};
        for (const f of fields) {
          const v = values[f.name].trim();
          cleaned[f.name] = v === "" ? null : v;
        }
        await onSubmit(cleaned);
        setSubmitting(false);
      }}
    >
      <div className="grid gap-3 md:grid-cols-2">
        {fields.map((f) => (
          <div key={f.name} className={`space-y-1 ${f.type === "textarea" ? "md:col-span-2" : ""}`}>
            <Label className="text-foreground">{f.label}</Label>
            {f.type === "textarea" ? (
              <Textarea
                value={values[f.name]}
                onChange={(e) => setValues((p) => ({ ...p, [f.name]: e.target.value }))}
                className="bg-input border-border"
              />
            ) : (
              <Input
                type={f.type ?? "text"}
                value={values[f.name]}
                onChange={(e) => setValues((p) => ({ ...p, [f.name]: e.target.value }))}
                required={f.required}
                className="bg-input border-border"
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-4 w-4 mr-1" /> Cancel
        </Button>
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}
