import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CMSConfig, CMSContextValue, BrandingConfig, User } from '../core/types';
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

const DEFAULT_BRANDING: BrandingConfig = {
  businessName: 'CMS',
};

function applyFavicon(url: string) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = url;
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
  const [branding, setBranding] = useState<BrandingConfig>({
    ...DEFAULT_BRANDING,
    ...config.branding,
  });

  const loadBranding = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('settings').select('*');
      if (error) throw error;

      const map: Record<string, string> = {};
      data?.forEach((s: any) => {
        map[s.key] = s.value;
      });

      const dbBranding: Partial<BrandingConfig> = {};
      if (map.branding_icon) dbBranding.iconUrl = map.branding_icon;
      if (map.branding_favicon) dbBranding.faviconUrl = map.branding_favicon;
      if (map.branding_logo) dbBranding.logoUrl = map.branding_logo;
      if (map.branding_primary_color) dbBranding.primaryColor = map.branding_primary_color;
      if (map.branding_accent_color) dbBranding.accentColor = map.branding_accent_color;
      if (map.branding_sidebar_bg) dbBranding.sidebarBg = map.branding_sidebar_bg;
      if (map.branding_sidebar_text) dbBranding.sidebarText = map.branding_sidebar_text;
      if (map.site_name) dbBranding.businessName = map.site_name;

      const merged: BrandingConfig = {
        ...DEFAULT_BRANDING,
        ...config.branding,
        ...dbBranding,
      };

      setBranding(merged);

      // Inject accent color as CSS custom property for global button theming
      const root = document.documentElement;
      if (merged.accentColor) {
        root.style.setProperty('--cms-accent', merged.accentColor);
      }
      if (merged.primaryColor) {
        root.style.setProperty('--cms-primary', merged.primaryColor);
      }

      if (merged.faviconUrl) {
        applyFavicon(merged.faviconUrl);
      }
    } catch (err) {
      console.error('Error loading branding settings:', err);
    }
  }, [supabase, config.branding]);

  const loadUser = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const u = await fetchCurrentUser(supabase);
        setUser(u);
        setIsAuthenticated(true);
        await loadBranding();
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
  }, [supabase, loadBranding]);

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
    branding,
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshBranding: loadBranding,
  };

  return (
    <CMSContext.Provider value={value}>
      <style>{`
        :root {
          --cms-accent: #2563eb;
          --cms-primary: #2563eb;
        }
        .cms-btn-accent {
          background-color: var(--cms-accent) !important;
        }
        .cms-btn-accent:hover {
          filter: brightness(0.9);
        }
        .cms-accent-bg {
          background-color: var(--cms-accent) !important;
        }
      `}</style>
      {children}
    </CMSContext.Provider>
  );
}
