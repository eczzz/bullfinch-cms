import { useState, useEffect, useCallback } from 'react';
import type { CMSRoute } from './types';

// ─── Path → Route parsing ───────────────────────────────────────────────────

function parsePath(pathname: string): CMSRoute {
  const raw = pathname.replace(/^\//, '').replace(/\/$/, '');
  const parts = raw.split('/').filter(Boolean);

  // Default / empty → content-models
  if (parts.length === 0) {
    return { page: 'content-models' };
  }

  // /models routes
  if (parts[0] === 'models') {
    if (parts.length === 1) return { page: 'content-models' };
    if (parts[1] === 'new') return { page: 'content-model-editor' };
    const id = parts[1];
    if (parts.length === 2) return { page: 'content-model-editor', id };
    if (parts[2] === 'entries') {
      if (parts.length === 3) return { page: 'content-entries', modelId: id };
      if (parts[3] === 'new') return { page: 'content-entry-editor', modelId: id };
      return { page: 'content-entry-editor', modelId: id, entryId: parts[3] };
    }
  }

  // /media
  if (parts[0] === 'media') return { page: 'media' };

  // /settings routes
  if (parts[0] === 'settings') {
    if (parts.length === 1) return { page: 'settings' };
    if (parts[1] === 'branding') return { page: 'settings' };
    if (parts[1] === 'integrations') return { page: 'settings' };
    if (parts[1] === 'users') return { page: 'users' };
    if (parts[1] === 'password') return { page: 'change-password' };
  }

  // /custom/:path
  if (parts[0] === 'custom' && parts.length >= 2) {
    return { page: 'custom', path: parts.slice(1).join('/') };
  }

  // Fallback
  return { page: 'content-models' };
}

// ─── Route → Path ───────────────────────────────────────────────────────────

export function routeToPath(route: CMSRoute): string {
  switch (route.page) {
    case 'content-models':
      return '/models';
    case 'content-model-editor':
      return route.id ? `/models/${route.id}` : '/models/new';
    case 'content-entries':
      return `/models/${route.modelId}/entries`;
    case 'content-entry-editor':
      return route.entryId
        ? `/models/${route.modelId}/entries/${route.entryId}`
        : `/models/${route.modelId}/entries/new`;
    case 'media':
      return '/media';
    case 'settings':
      return '/settings';
    case 'users':
      return '/settings/users';
    case 'change-password':
      return '/settings/password';
    case 'custom':
      return `/custom/${route.path}`;
    default:
      return '/models';
  }
}

// ─── Standalone navigate ────────────────────────────────────────────────────

export function navigate(path: string): void {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  history.pushState({}, '', cleanPath);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

// ─── React hook ─────────────────────────────────────────────────────────────

export function useRouter(): { route: CMSRoute; navigate: (path: string) => void } {
  const [route, setRoute] = useState<CMSRoute>(() => {
    const pathname = window.location.pathname;
    if (!pathname || pathname === '/') {
      history.replaceState({}, '', '/models');
      return { page: 'content-models' };
    }
    return parsePath(pathname);
  });

  useEffect(() => {
    const onPopState = () => {
      setRoute(parsePath(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const nav = useCallback((path: string) => {
    navigate(path);
  }, []);

  return { route, navigate: nav };
}
