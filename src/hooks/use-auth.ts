import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export type AppRole = "admin" | "doctor" | "nurse" | "charge_nurse";

interface AuthState {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  loading: boolean;
  displayName: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    roles: [],
    loading: true,
    displayName: null,
  });

  const fetchRolesAndProfile = useCallback(async (userId: string) => {
    const [rolesRes, profileRes] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("profiles").select("display_name").eq("user_id", userId).single(),
    ]);
    return {
      roles: (rolesRes.data?.map((r) => r.role) ?? []) as AppRole[],
      displayName: profileRes.data?.display_name ?? null,
    };
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          // Mark loading while we hydrate roles/profile so route guards wait
          setState((s) => ({ ...s, user: session.user, session, loading: true }));
          // Fire-and-forget to avoid deadlocks inside the auth callback
          fetchRolesAndProfile(session.user.id).then(({ roles, displayName }) => {
            setState({ user: session.user, session, roles, loading: false, displayName });
          });
        } else {
          setState({ user: null, session: null, roles: [], loading: false, displayName: null });
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { roles, displayName } = await fetchRolesAndProfile(session.user.id);
        setState({ user: session.user, session, roles, loading: false, displayName });
      } else {
        setState((s) => ({ ...s, loading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchRolesAndProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const hasRole = useCallback(
    (role: AppRole) => state.roles.includes(role),
    [state.roles]
  );

  const hasAnyRole = useCallback(
    () => state.roles.length > 0,
    [state.roles]
  );

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    hasRole,
    hasAnyRole,
    isAuthenticated: !!state.user,
  };
}

