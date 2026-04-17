import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CMSConfig, CMSContextValue, BrandingConfig, User, StorageAdapter } from '../core/types';
import { fetchCurrentUser } from '../core/queries';
import { createR2StorageAdapter, hasR2Settings } from '../core/storage';

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
  const [r2Storage, setR2Storage] = useState<StorageAdapter | null>(null);

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
      if (map.branding_business_name) dbBranding.businessName = map.branding_business_name;
      // Legacy fallback: migrate site_name → branding_business_name
      else if (map.site_name) dbBranding.businessName = map.site_name;

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

      // Auto-detect R2 storage settings and create adapter if configured
      // Only auto-wire if the consumer hasn't already provided a storage adapter
      if (!config.storage && hasR2Settings(map)) {
        const schema = (supabase as any).rest?.schemaName as string | undefined;
        setR2Storage(createR2StorageAdapter(supabase, schema));
      }
    } catch (err) {
      console.error('Error loading branding settings:', err);
    }
  }, [supabase, config.branding, config.storage]);

  const loadUser = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const u = await fetchCurrentUser(supabase);
        if (!u) {
          // Session exists in auth.users but the caller isn't a member of
          // this tenant schema — sign out so stale sessions from other
          // workspaces can't linger on this one.
          await supabase.auth.signOut();
          setUser(null);
          setIsAuthenticated(false);
        } else {
          setUser(u);
          setIsAuthenticated(true);
        }
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

  // Load branding immediately (before auth) so the login page gets it too
  useEffect(() => {
    loadBranding();
  }, [loadBranding]);

  useEffect(() => {
    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        loadUser();
        // Re-load settings now that we're authenticated — RLS may expose
        // additional rows (e.g. R2 integration keys) to authenticated users.
        loadBranding();
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, loadUser, loadBranding]);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // The auth.users table is shared across tenants. Gate login on presence
    // of a row in this tenant's users table so a valid auth session from
    // another workspace can't sign into this one.
    const u = await fetchCurrentUser(supabase);
    if (!u) {
      await supabase.auth.signOut();
      throw new Error("You don't have access to this workspace.");
    }
  }, [supabase]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
  }, [supabase]);

  // Build effective config: merge auto-detected R2 storage into config if present
  const effectiveConfig = useMemo<CMSConfig>(() => {
    if (config.storage || !r2Storage) return config;
    return { ...config, storage: r2Storage };
  }, [config, r2Storage]);

  const value: CMSContextValue = {
    supabase,
    config: effectiveConfig,
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
