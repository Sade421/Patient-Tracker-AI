import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { StaffShell } from "@/components/StaffShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Search, Shield, Stethoscope, UserCog } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/staff/manage")({
  component: StaffManagePage,
  head: () => ({
    meta: [
      { title: "Staff Management — PatientTracker" },
      { name: "description", content: "Browse clinical staff, roles, and providers." },
    ],
  }),
});

type Role = { user_id: string; role: string };
type Profile = { user_id: string; display_name: string };
type Provider = { id: string; name: string; role: string | null; user_id: string | null };

const ROLE_META: Record<string, { label: string; cls: string; icon: typeof Shield }> = {
  admin: { label: "Admin", cls: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30", icon: Shield },
  doctor: { label: "Doctor", cls: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30", icon: Stethoscope },
  charge_nurse: { label: "Charge Nurse", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30", icon: UserCog },
  nurse: { label: "Nurse", cls: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30", icon: UserCog },
};

function StaffManagePage() {
  const navigate = useNavigate();
  const { isAuthenticated, hasAnyRole, loading } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [fetching, setFetching] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated || !hasAnyRole()) navigate({ to: "/staff/login" });
  }, [loading, isAuthenticated, hasAnyRole, navigate]);

  useEffect(() => {
    if (!isAuthenticated || !hasAnyRole()) return;
    (async () => {
      const [pr, rr, prov] = await Promise.all([
        supabase.from("profiles").select("user_id, display_name"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("providers").select("id, name, role, user_id"),
      ]);
      setProfiles((pr.data ?? []) as Profile[]);
      setRoles((rr.data ?? []) as Role[]);
      setProviders((prov.data ?? []) as Provider[]);
      setFetching(false);
    })();
  }, [isAuthenticated, hasAnyRole]);

  const members = useMemo(() => {
    const map = new Map<string, { user_id: string; name: string; roles: string[] }>();
    for (const p of profiles) {
      map.set(p.user_id, { user_id: p.user_id, name: p.display_name || "Unnamed", roles: [] });
    }
    for (const r of roles) {
      const m = map.get(r.user_id) ?? { user_id: r.user_id, name: "Unnamed", roles: [] };
      m.roles.push(r.role);
      map.set(r.user_id, m);
    }
    const list = Array.from(map.values()).filter((m) => m.roles.length > 0);
    const needle = q.trim().toLowerCase();
    return list
      .filter((m) => !needle || m.name.toLowerCase().includes(needle) || m.roles.some((r) => r.toLowerCase().includes(needle)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [profiles, roles, q]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of roles) c[r.role] = (c[r.role] ?? 0) + 1;
    return c;
  }, [roles]);

  return (
    <StaffShell title="Staff Management">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <div>
          <h2 className="font-heading text-2xl font-semibold tracking-tight">Staff Management</h2>
          <p className="text-sm text-muted-foreground">Clinical team members and providers.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {(["doctor", "nurse", "charge_nurse", "admin"] as const).map((r) => {
            const m = ROLE_META[r];
            const Icon = m.icon;
            return (
              <div key={r} className={cn("flex items-center justify-between rounded-xl border p-4", m.cls)}>
                <div>
                  <div className="text-[11px] uppercase tracking-wide opacity-80">{m.label}</div>
                  <div className="text-2xl font-semibold tabular-nums">{counts[r] ?? 0}</div>
                </div>
                <Icon className="h-5 w-5 opacity-70" />
              </div>
            );
          })}
        </div>

        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name or role..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>

        {fetching ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Team members</CardTitle>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No staff members match.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {members.map((m, i) => (
                    <li
                      key={m.user_id}
                      className="flex items-center justify-between gap-3 py-3 animate-fade-in"
                      style={{ animationDelay: `${Math.min(i * 25, 200)}ms` }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-sm font-semibold">
                          {m.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{m.name}</p>
                          <p className="truncate text-xs text-muted-foreground font-mono">{m.user_id.slice(0, 8)}…</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {m.roles.map((r) => {
                          const meta = ROLE_META[r] ?? { label: r, cls: "bg-muted text-muted-foreground border-border" };
                          return (
                            <span key={r} className={cn("rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", meta.cls)}>
                              {meta.label}
                            </span>
                          );
                        })}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        {providers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Providers directory</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {providers.map((p) => (
                  <li key={p.id} className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
                    <span className="text-sm font-medium">{p.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">{p.role ?? "—"}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </StaffShell>
  );
}
