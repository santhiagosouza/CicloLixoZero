import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "master_admin" | "client_admin" | "client_user";

interface RoleRow {
  role: AppRole;
  client_id: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: RoleRow[];
  clientId: string | null;
  isMasterAdmin: boolean;
  isClientAdmin: boolean;
  fullName: string;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string>("");

  const loadProfileAndRoles = async (uid: string) => {
    const [{ data: rolesData }, { data: profileData }] = await Promise.all([
      supabase.from("user_roles").select("role, client_id").eq("user_id", uid),
      supabase.from("profiles").select("client_id, full_name").eq("id", uid).maybeSingle(),
    ]);
    setRoles((rolesData ?? []) as RoleRow[]);
    setClientId(profileData?.client_id ?? null);
    setFullName(profileData?.full_name ?? "");
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setTimeout(() => { loadProfileAndRoles(sess.user.id); }, 0);
      } else {
        setRoles([]);
        setClientId(null);
        setFullName("");
      }
    });

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) loadProfileAndRoles(sess.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isMasterAdmin = roles.some((r) => r.role === "master_admin");
  const isClientAdmin = roles.some((r) => r.role === "client_admin");

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refresh = async () => {
    if (user) await loadProfileAndRoles(user.id);
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, roles, clientId, isMasterAdmin, isClientAdmin, fullName, signOut, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
