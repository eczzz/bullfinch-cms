import React, { useState, useEffect } from 'react';
import {
  Settings, LogOut, Images, Database, File, Feather,
} from 'lucide-react';
import { useCMS, useSupabase } from '../provider';
import { fetchContentModels } from '../../core/queries';
import { routeToPath } from '../../core/router';
import { DEFAULT_SIDEBAR_SECTIONS } from '../../core/config';
import type {
  ContentModel,
  CMSRoute,
  SidebarItem,
  SidebarSection,
  BuiltInSidebarItemId,
  UserRole,
} from '../../core/types';

const DEFAULTS = {
  sidebarBg: '#111827',      // gray-900
  sidebarText: '#ffffff',
  primaryColor: '#2563eb',   // blue-600
  accentColor: '#2563eb',    // blue-600
};

interface SidebarProps {
  currentRoute: CMSRoute;
}

/** Built-in item renderer context — shared props for the four built-in NavLinks. */
interface BuiltInContext {
  currentRoute: CMSRoute;
  collapsed: boolean;
  accentColor: string;
  sidebarText: string;
  sidebarBg: string;
}

function renderBuiltIn(id: BuiltInSidebarItemId, ctx: BuiltInContext): React.ReactElement | null {
  const { currentRoute, collapsed, accentColor, sidebarText, sidebarBg } = ctx;
  const isActive = (page: string) => currentRoute.page === page;
  const isEntriesActive =
    currentRoute.page === 'entries' ||
    currentRoute.page === 'content-entries' ||
    currentRoute.page === 'content-entry-editor';

  switch (id) {
    case 'content-models':
      return (
        <NavLink
          key="content-models"
          href={routeToPath({ page: 'content-models' })}
          active={isActive('content-models') || isActive('content-model-editor')}
          icon={Database}
          label="Content Models"
          collapsed={collapsed}
          accentColor={accentColor}
          textColor={sidebarText}
          sidebarBg={sidebarBg}
        />
      );
    case 'entries':
      return (
        <NavLink
          key="entries"
          href="/entries"
          active={isEntriesActive}
          icon={File}
          label="Entries"
          collapsed={collapsed}
          accentColor={accentColor}
          textColor={sidebarText}
          sidebarBg={sidebarBg}
        />
      );
    case 'media':
      return (
        <NavLink
          key="media"
          href={routeToPath({ page: 'media' })}
          active={isActive('media')}
          icon={Images}
          label="Media"
          collapsed={collapsed}
          accentColor={accentColor}
          textColor={sidebarText}
          sidebarBg={sidebarBg}
        />
      );
    case 'settings':
      return (
        <NavLink
          key="settings"
          href={routeToPath({ page: 'settings' })}
          active={isActive('settings') || isActive('users') || isActive('change-password')}
          icon={Settings}
          label="Settings"
          collapsed={collapsed}
          accentColor={accentColor}
          textColor={sidebarText}
          sidebarBg={sidebarBg}
        />
      );
    default:
      return null;
  }
}

function renderCustomItem(item: SidebarItem, ctx: BuiltInContext): React.ReactElement {
  const { currentRoute, collapsed, accentColor, sidebarText, sidebarBg } = ctx;
  const active =
    currentRoute.page === 'custom' &&
    (currentRoute as Extract<CMSRoute, { page: 'custom' }>).path === item.path;

  return (
    <NavLink
      key={item.id}
      href={routeToPath({ page: 'custom', path: item.path })}
      active={active}
      icon={() => <span className="w-4 h-4 flex items-center justify-center text-xs">{item.icon || '📄'}</span>}
      label={item.label}
      collapsed={collapsed}
      accentColor={accentColor}
      textColor={sidebarText}
      sidebarBg={sidebarBg}
    />
  );
}

/** True when the item/section should be visible to a user with `role`. */
function isVisibleToRole(roles: UserRole[] | undefined, role: UserRole | undefined): boolean {
  if (!roles || roles.length === 0) return true;
  if (!role) return false;
  return roles.includes(role);
}

export function Sidebar({ currentRoute }: SidebarProps) {
  const supabase = useSupabase();
  const { user, logout, config, branding } = useCMS();
  const [collapsed, setCollapsed] = useState(true);
  const [, setModels] = useState<ContentModel[]>([]);

  useEffect(() => {
    fetchContentModels(supabase).then(setModels).catch(console.error);
  }, [supabase]);
  // `models` is fetched only to warm the query cache; not rendered in the sidebar itself.

  const sidebarBg = branding.sidebarBg || DEFAULTS.sidebarBg;
  const sidebarText = branding.sidebarText || DEFAULTS.sidebarText;
  const primaryColor = branding.primaryColor || DEFAULTS.primaryColor;
  const accentColor = branding.accentColor || DEFAULTS.accentColor;

  const sections: SidebarSection[] = config.sidebarSections ?? DEFAULT_SIDEBAR_SECTIONS;
  const role = user?.role;

  const ctx: BuiltInContext = {
    currentRoute,
    collapsed,
    accentColor,
    sidebarText,
    sidebarBg,
  };

  return (
    <div
      className="flex flex-col h-screen transition-all duration-300 overflow-hidden flex-shrink-0"
      style={{ width: collapsed ? 64 : 208, backgroundColor: sidebarBg, color: sidebarText }}
      onMouseEnter={() => setCollapsed(false)}
      onMouseLeave={() => setCollapsed(true)}
    >
      {/* Logo */}
      <div
        className={`px-4 py-4 flex items-center ${collapsed ? 'justify-start gap-2.5' : 'justify-center'}`}
        style={{ borderBottom: `1px solid ${sidebarBg}`, minHeight: 56 }}
      >
        <div
          className={`flex items-center justify-center flex-shrink-0 overflow-hidden transition-all duration-150 ${
            !collapsed && branding.logoUrl ? 'w-0 h-0 opacity-0' : 'w-7 h-7 opacity-100'
          } ${branding.iconUrl ? '' : 'rounded-lg'}`}
          style={branding.iconUrl ? undefined : { backgroundColor: primaryColor }}
        >
          {branding.iconUrl ? (
            <img src={branding.iconUrl} alt="Icon" className="w-full h-full object-contain" />
          ) : (
            <Feather className="w-3.5 h-3.5 text-white" />
          )}
        </div>
        <div className={`transition-opacity duration-150 ${collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
          {branding.logoUrl ? (
            <img src={branding.logoUrl} alt="Logo" className="max-h-14 object-contain" />
          ) : (
            <p className="text-sm font-semibold whitespace-nowrap" style={{ color: sidebarText }}>
              {branding.businessName || 'CMS'}
            </p>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto overflow-x-hidden space-y-1">
        {sections.map((section) => {
          if (!isVisibleToRole(section.roles, role)) return null;

          const renderedItems = section.items
            .map((item, idx) => {
              if (typeof item === 'string') {
                return renderBuiltIn(item, ctx);
              }
              if (!isVisibleToRole(item.roles, role)) return null;
              return (
                <React.Fragment key={item.id ?? idx}>
                  {renderCustomItem(item, ctx)}
                </React.Fragment>
              );
            })
            .filter(Boolean);

          if (renderedItems.length === 0) return null;

          return (
            <React.Fragment key={section.id}>
              {section.label && (
                <div className={`px-2.5 pt-4 pb-1 transition-opacity duration-150 ${collapsed ? 'opacity-0' : 'opacity-100'}`}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: sidebarText }}>
                    {section.label}
                  </p>
                </div>
              )}
              {renderedItems}
            </React.Fragment>
          );
        })}

        {/* Legacy: custom sidebar items appended after all sections */}
        {config.sidebarItems
          ?.filter((s) => s.position !== 'bottom')
          .filter((s) => isVisibleToRole(s.roles, role))
          .map((item) => renderCustomItem(item, ctx))}
      </nav>

      {/* Footer — user info + sign out */}
      <div className="px-3 py-3" style={{ borderTop: `1px solid ${sidebarText}15` }}>
        {!collapsed && user && (
          <div className="text-xs px-2.5 mb-2 truncate" style={{ color: sidebarText }}>{user.email}</div>
        )}
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all duration-150"
          style={{ color: sidebarText }}
          title={collapsed ? 'Sign Out' : undefined}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = `${sidebarText}15`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
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
  accentColor: string;
  textColor: string;
  sidebarBg: string;
  sub?: boolean;
}

function NavLink({ href, active, icon: Icon, label, collapsed, accentColor, textColor, sub }: NavLinkProps) {
  const [hovered, setHovered] = useState(false);

  const style: React.CSSProperties = active
    ? { backgroundColor: accentColor, color: '#ffffff' }
    : hovered
      ? { backgroundColor: `${textColor}15`, color: textColor }
      : { color: textColor };

  return (
    <a
      href={href}
      className={`flex items-center gap-2.5 rounded-lg text-sm transition-all duration-150 ${
        sub ? 'pl-8 px-2.5 py-2' : 'px-2.5 py-2'
      } ${active ? 'font-medium' : ''}`}
      style={style}
      title={collapsed ? label : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
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
