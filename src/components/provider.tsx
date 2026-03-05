import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CMSConfig, CMSContextValue, User } from '../core/types';
import { fetchCurrentUser } from '../core/queries';

const CMSContext = createContext<CMSContextValue | null>(null);

export function useCMS(): CMSContextValue {
  const ctx = useContext(CMSContext);
  if (!ctx) throw new Error('useCMS must be used within a CMSProvider');
  return ctx;
}

export function useSupabase(): SupabaseClient {
  return useCMS().supabase;
}

export function useUser(): User | null {
  return useCMS().user;
}

interface CMSProviderProps {
  supabase: SupabaseClient;
  config?: CMSConfig;
  children: React.ReactNode;
}

export function CMSProvider({ supabase, config = {}, children }: CMSProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const u = await fetchCurrentUser(supabase);
        setUser(u);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        loadUser();
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, loadUser]);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, [supabase]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
  }, [supabase]);

  const value: CMSContextValue = {
    supabase,
    config,
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
  };

  return <CMSContext.Provider value={value}>{children}</CMSContext.Provider>;
}
