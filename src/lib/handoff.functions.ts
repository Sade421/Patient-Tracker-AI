import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type HandoffResult = {
  handoff: string;
  generatedAt: string;
  patientCount: number;
  error: string | null;
};

type HandoffRosterItem = {
  room: string;
  name: string;
  age: number | string;
  acuity: number | null;
  seen: boolean;
  documentation_complete: boolean | null;
  minutes_since_last_assessment: number;
  symptoms: string;
  vitals: { hr: number | null; bp: string | null; spo2: number | null };
};

function unavailable(message: string, error: string, patientCount = 0): HandoffResult {
  return {
    handoff: `# Handoff unavailable\n\n${message}`,
    generatedAt: new Date().toISOString(),
    patientCount,
    error,
  };
}

function buildRuleBasedHandoff(roster: HandoffRosterItem[], note?: string) {
  const list = (items: HandoffRosterItem[], empty: string) =>
    items.length
      ? items
          .map(
            (p) =>
              `- **${p.name}** (Rm ${p.room}) — acuity ${p.acuity ?? "n/a"}, last assessment ${p.minutes_since_last_assessment}m ago${p.symptoms ? `; ${p.symptoms}` : ""}`,
          )
          .join("\n")
      : `- ${empty}`;

  const unseen = roster.filter((p) => !p.seen);
  const overdue = roster.filter((p) => p.minutes_since_last_assessment > 60);
  const watchlist = roster.filter((p) => (p.acuity ?? 0) >= 7);
  const pendingDocs = roster.filter((p) => p.seen && p.documentation_complete === false);

  return `# Shift Handoff Brief

${note ? `_${note}_\n` : ""}## Overview
- Active census: ${roster.length} patient${roster.length === 1 ? "" : "s"}.
- High-acuity watchlist: ${watchlist.length}; overdue assessments: ${overdue.length}; pending documentation: ${pendingDocs.length}.

## Unseen / Awaiting Initial Assessment
${list(unseen, "No patients awaiting initial assessment.")}

## Overdue Assessments
${list(overdue, "No assessments are currently overdue.")}

## High Acuity Watchlist
${list(watchlist, "No high-acuity patients flagged.")}

## Pending Documentation
${list(pendingDocs, "No pending documentation for seen patients.")}

## Recommended Priorities for Oncoming Shift
- Round on red/overdue rooms first, then amber rooms by acuity.
- Complete pending documentation before sign-off.
- Re-check high-acuity vitals and symptoms early in the shift.`;
}

export const generateShiftHandoff = createServerFn({ method: "POST" })
  .handler(async () => {
    const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      return unavailable("The backend is not configured for server-side handoff generation.", "BACKEND_NOT_CONFIGURED");
    }

    const authHeader = getRequest().headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return unavailable("Please sign in again before generating a shift handoff.", "AUTH_REQUIRED");
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return unavailable("Your session expired. Please sign in again and retry the handoff.", "AUTH_INVALID");
    }

    const { data: visits, error: visitsError } = await supabase
      .from("visits")
      .select(
        "id, patient_id, admission_time, last_interaction_at, seen_time, acuity_score, documentation_complete, heart_rate, systolic_bp, diastolic_bp, spo2",
      )
      .is("completed_time", null)
      .order("admission_time", { ascending: false });

    if (visitsError) {
      console.error("Failed to load census for handoff:", visitsError);
      return unavailable("The active census could not be loaded. Please retry after refreshing the board.", "CENSUS_LOAD_FAILED");
    }

    const ids = Array.from(new Set((visits ?? []).map((v) => v.patient_id)));
    const [{ data: patients, error: patientsError }, { data: symptoms, error: symptomsError }] = await Promise.all([
      ids.length
        ? supabase.from("patients").select("id, name, age, gender, room_number").in("id", ids)
        : Promise.resolve({ data: [] as any[], error: null }),
      ids.length
        ? supabase.from("symptoms").select("patient_id, description, severity").in("patient_id", ids)
        : Promise.resolve({ data: [] as any[], error: null }),
    ]);

    if (patientsError || symptomsError) {
      console.error("Failed to load handoff details:", patientsError ?? symptomsError);
      return unavailable("Patient details could not be loaded for the handoff.", "HANDOFF_DETAILS_LOAD_FAILED", visits?.length ?? 0);
    }

    const pmap = new Map((patients ?? []).map((p: any) => [p.id, p]));
    const smap = new Map<string, any[]>();
    (symptoms ?? []).forEach((s: any) => {
      const arr = smap.get(s.patient_id) ?? [];
      arr.push(s);
      smap.set(s.patient_id, arr);
    });

    const now = Date.now();
    const roster = (visits ?? []).map((v) => {
      const p: any = pmap.get(v.patient_id) ?? { name: "Unknown", age: "?", room_number: null };
      const ref = v.last_interaction_at ?? v.admission_time;
      const minutesSince = Math.floor((now - new Date(ref).getTime()) / 60_000);
      const sx = (smap.get(v.patient_id) ?? []).map((s: any) => s.description).join("; ");
      return {
        room: p.room_number ?? "—",
        name: p.name,
        age: p.age,
        acuity: v.acuity_score ?? null,
        seen: !!v.seen_time,
        documentation_complete: v.documentation_complete,
        minutes_since_last_assessment: minutesSince,
        symptoms: sx,
        vitals: {
          hr: v.heart_rate,
          bp: v.systolic_bp ? `${v.systolic_bp}/${v.diastolic_bp ?? "—"}` : null,
          spo2: v.spo2,
        },
      };
    });

    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    if (!LOVABLE_API_KEY) {
      return {
        handoff: buildRuleBasedHandoff(roster, "AI generation is not configured, so this brief was generated from census rules."),
        generatedAt: new Date().toISOString(),
        patientCount: roster.length,
        error: "AI_NOT_CONFIGURED",
      };
    }

    const prompt = `You are an experienced charge nurse preparing a concise shift handoff brief.

Active census (${roster.length} patients):
${JSON.stringify(roster, null, 2)}

Produce a clear, scannable handoff in markdown with these sections:
1. **Overview** — 1-2 sentence summary (census size, acuity mix).
2. **Unseen / Awaiting Initial Assessment** — patients without a seen_time.
3. **Overdue Assessments** — minutes_since_last_assessment > 60.
4. **High Acuity Watchlist** — acuity >= 7, with key vitals/symptoms.
5. **Pending Documentation** — patients where documentation_complete is false and seen=true.
6. **Recommended Priorities for Oncoming Shift** — 3-5 bullet action items.

Keep it tight, clinical, no fluff. Use bullet points and bold patient names with room numbers.`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You generate concise, clinically accurate nursing shift handoff briefs." },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!res.ok) {
        const t = await res.text();
        console.error(`AI gateway error ${res.status}: ${t}`);
        const msg =
          res.status === 429
            ? "AI rate limit reached. Please try again in a moment."
            : res.status === 402
              ? "AI credits exhausted. Please add credits to your workspace."
              : `AI service unavailable (${res.status}).`;
        return {
          handoff: buildRuleBasedHandoff(roster, msg),
          generatedAt: new Date().toISOString(),
          patientCount: roster.length,
          error: msg,
        };
      }
      const json = await res.json();
      const content: string = json.choices?.[0]?.message?.content ?? "No handoff generated.";
      return {
        handoff: content,
        generatedAt: new Date().toISOString(),
        patientCount: roster.length,
        error: null,
      };
    } catch (err: any) {
      console.error("Handoff generation failed:", err);
      return {
        handoff: buildRuleBasedHandoff(roster, "AI generation failed, so this brief was generated from census rules."),
        generatedAt: new Date().toISOString(),
        patientCount: roster.length,
        error: err?.message ?? "Unknown error",
      };
    }
  });
