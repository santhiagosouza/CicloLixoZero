import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  client_id: string | null;
  full_name: string | null;
  email: string | null;
}

interface UserRole {
  role: 'master_admin' | 'client_admin' | 'client_user';
  client_id: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  roles: UserRole[];
  role: 'master_admin' | 'client_admin' | 'client_user' | null;
  clientId: string | null;
  isMasterAdmin: boolean;
  isClientAdmin: boolean;
  loading: boolean;
  setImpersonatedClient: (clientId: string | null) => void;
  impersonatedClientId: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [impersonatedClientId, setImpersonatedClientState] = useState<string | null>(
    sessionStorage.getItem('impersonated_client_id')
  );
  const [loading, setLoading] = useState(true);

  const setImpersonatedClient = (id: string | null) => {
    if (id) {
      sessionStorage.setItem('impersonated_client_id', id);
    } else {
      sessionStorage.removeItem('impersonated_client_id');
    }
    setImpersonatedClientState(id);
  };

  const fetchUserData = async (currentUser: User) => {
    try {
      // 1. Fetch Profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (profileError) throw profileError;
      setProfile(profileData as Profile);

      // 2. Fetch Roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('role, client_id')
        .eq('user_id', currentUser.id);

      if (rolesError) throw rolesError;
      setRoles((rolesData || []) as UserRole[]);
    } catch (error) {
      console.error('Error fetching user meta data:', error);
    }
  };

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchUserData(session.user).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setLoading(true);
        if (session?.user) {
          setUser(session.user);
          await fetchUserData(session.user);
        } else {
          setUser(null);
          setProfile(null);
          setRoles([]);
          setImpersonatedClientState(null);
          sessionStorage.removeItem('impersonated_client_id');
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
  };

  // Determine active roles and privileges
  const isMasterAdmin = roles.some((r) => r.role === 'master_admin');
  const activeRole = roles.length > 0 ? roles[0].role : null;
  const isClientAdmin = roles.some((r) => r.role === 'client_admin');

  // Client ID: if impersonated (by master admin), use that, otherwise use profile's client_id
  const clientId = (isMasterAdmin && impersonatedClientId) 
    ? impersonatedClientId 
    : (profile?.client_id || null);

  const value = {
    user,
    profile,
    roles,
    role: activeRole,
    clientId,
    isMasterAdmin,
    isClientAdmin,
    loading,
    setImpersonatedClient,
    impersonatedClientId,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
