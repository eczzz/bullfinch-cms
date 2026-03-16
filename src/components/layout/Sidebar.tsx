import React, { useState, useEffect } from 'react';
import {
  Settings, LogOut, Images, Database, File, ChevronDown, ChevronRight, Feather,
} from 'lucide-react';
import { useCMS, useSupabase } from '../provider';
import { fetchContentModels } from '../../core/queries';
import { routeToPath } from '../../core/router';
import type { ContentModel, CMSRoute } from '../../core/types';

interface SidebarProps {
  currentRoute: CMSRoute;
}

export function Sidebar({ currentRoute }: SidebarProps) {
  const supabase = useSupabase();
  const { user, logout, config } = useCMS();
  const [collapsed, setCollapsed] = useState(true);
  const [contentExpanded, setContentExpanded] = useState(true);
  const [models, setModels] = useState<ContentModel[]>([]);

  useEffect(() => {
    fetchContentModels(supabase).then(setModels).catch(console.error);
  }, [supabase]);

  const branding = config.branding || {};

  const isActive = (page: string) => currentRoute.page === page;
  const isModelActive = (modelId: string) =>
    (currentRoute.page === 'content-entries' && currentRoute.modelId === modelId) ||
    (currentRoute.page === 'content-entry-editor' && currentRoute.modelId === modelId);

  return (
    <div
      className="flex flex-col h-screen bg-gray-900 text-white transition-all duration-300 overflow-hidden flex-shrink-0"
      style={{ width: collapsed ? 64 : 256 }}
      onMouseEnter={() => setCollapsed(false)}
      onMouseLeave={() => setCollapsed(true)}
    >
      {/* Logo */}
      <div className="px-4 py-4 flex items-center gap-2.5 border-b border-gray-800">
        <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Feather className="w-3.5 h-3.5 text-white" />
        </div>
        <div className={`transition-opacity duration-150 ${collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
          <p className="text-sm font-semibold text-white whitespace-nowrap">{branding.businessName || 'CMS'}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto overflow-x-hidden space-y-1">
        {/* CONTENT section header */}
        <div className={`px-2.5 pt-2 pb-1 transition-opacity duration-150 ${collapsed ? 'opacity-0' : 'opacity-100'}`}>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Content</p>
        </div>

        {/* Content Models link */}
        <NavLink
          href={routeToPath({ page: 'content-models' })}
          active={isActive('content-models')}
          icon={Database}
          label="Content Models"
          collapsed={collapsed}
        />

        {/* Collapsible content models list */}
        <button
          onClick={() => setContentExpanded(!contentExpanded)}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-white/10 text-sm transition-all duration-150"
        >
          <File className="w-4 h-4 flex-shrink-0" />
          <span className={`flex-1 text-left whitespace-nowrap transition-opacity duration-150 ${collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
            Entries
          </span>
          {!collapsed && (
            contentExpanded
              ? <ChevronDown className="w-3 h-3 opacity-60" />
              : <ChevronRight className="w-3 h-3 opacity-60" />
          )}
        </button>

        {contentExpanded && !collapsed && (
          <div className="space-y-0.5">
            {models.map((m) => (
              <NavLink
                key={m.id}
                href={routeToPath({ page: 'content-entries', modelId: m.id })}
                active={isModelActive(m.id)}
                icon={File}
                label={m.name}
                collapsed={collapsed}
                sub
              />
            ))}
          </div>
        )}

        {/* Media */}
        <NavLink
          href={routeToPath({ page: 'media' })}
          active={isActive('media')}
          icon={Images}
          label="Media"
          collapsed={collapsed}
        />

        {/* SETTINGS section header */}
        <div className={`px-2.5 pt-4 pb-1 transition-opacity duration-150 ${collapsed ? 'opacity-0' : 'opacity-100'}`}>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Settings</p>
        </div>

        <NavLink
          href={routeToPath({ page: 'settings' })}
          active={isActive('settings') || isActive('users') || isActive('change-password')}
          icon={Settings}
          label="Settings"
          collapsed={collapsed}
        />

        {/* Custom sidebar items */}
        {config.sidebarItems?.filter((s) => s.position !== 'bottom').map((item) => (
          <NavLink
            key={item.id}
            href={routeToPath({ page: 'custom', path: item.path })}
            active={currentRoute.page === 'custom' && (currentRoute as Extract<CMSRoute, { page: 'custom' }>).path === item.path}
            icon={() => <span className="w-4 h-4 flex items-center justify-center text-xs">{item.icon || '📄'}</span>}
            label={item.label}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Footer — user info + sign out */}
      <div className="px-3 py-3 border-t border-gray-800">
        {!collapsed && user && (
          <div className="text-xs text-gray-500 px-2.5 mb-2 truncate">{user.email}</div>
        )}
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-white/10 text-sm transition-all duration-150"
          title={collapsed ? 'Sign Out' : undefined}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span className={`whitespace-nowrap transition-opacity duration-150 ${collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
            Sign Out
          </span>
        </button>
      </div>
    </div>
  );
}

// ─── NavLink component ──────────────────────────────────────────────────────

interface NavLinkProps {
  href: string;
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  collapsed: boolean;
  sub?: boolean;
}

function NavLink({ href, active, icon: Icon, label, collapsed, sub }: NavLinkProps) {
  return (
    <a
      href={href}
      className={`flex items-center gap-2.5 rounded-lg text-sm transition-all duration-150 ${
        sub ? 'pl-8 px-2.5 py-2' : 'px-2.5 py-2'
      } ${
        active
          ? 'bg-blue-600 text-white font-medium'
          : 'text-gray-400 hover:text-gray-200 hover:bg-white/10'
      }`}
      title={collapsed ? label : undefined}
    >
      <div className={`flex-shrink-0 flex items-center justify-center ${sub ? 'w-4 h-4' : 'w-5 h-5'}`}>
        <Icon className={sub ? 'w-3 h-3' : 'w-4 h-4'} />
      </div>
      <span
        className={`whitespace-nowrap transition-opacity duration-150 ${
          collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
        }`}
      >
        {label}
      </span>
    </a>
  );
}
