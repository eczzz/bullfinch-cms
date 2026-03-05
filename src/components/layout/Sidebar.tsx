import React, { useState, useEffect } from 'react';
import {
  Settings, LogOut, Images, Database, FileText, ChevronDown, ChevronRight, File,
} from 'lucide-react';
import { useCMS, useSupabase } from '../provider';
import { fetchContentModels } from '../../core/queries';
import type { ContentModel, CMSRoute } from '../../core/types';

interface SidebarProps {
  currentRoute: CMSRoute;
  onNavigate: (route: CMSRoute) => void;
}

export function Sidebar({ currentRoute, onNavigate }: SidebarProps) {
  const supabase = useSupabase();
  const { user, logout, config } = useCMS();
  const [collapsed, setCollapsed] = useState(true);
  const [contentExpanded, setContentExpanded] = useState(true);
  const [models, setModels] = useState<ContentModel[]>([]);

  useEffect(() => {
    fetchContentModels(supabase).then(setModels).catch(console.error);
  }, [supabase]);

  const isActive = (page: string) => currentRoute.page === page;
  const isModelActive = (modelId: string) =>
    (currentRoute.page === 'content-entries' && (currentRoute as any).modelId === modelId) ||
    (currentRoute.page === 'content-entry-editor' && (currentRoute as any).modelId === modelId);

  const branding = config.branding || {};

  const NavButton = ({ active, icon: Icon, label, onClick, sub }: { active: boolean; icon: any; label: string; onClick: () => void; sub?: boolean }) => (
    <button
      onClick={onClick}
      className={`bcms-w-full bcms-flex bcms-items-center bcms-gap-3 bcms-px-4 bcms-py-2 bcms-rounded-lg bcms-transition bcms-text-sm ${sub ? 'bcms-pl-10' : ''} ${
        active
          ? 'bcms-bg-blue-600 bcms-text-white'
          : 'bcms-text-gray-300 hover:bcms-bg-white/10 hover:bcms-text-white'
      }`}
      title={collapsed ? label : ''}
    >
      <Icon className={`bcms-flex-shrink-0 ${sub ? 'bcms-w-3 bcms-h-3' : 'bcms-w-4 bcms-h-4'}`} />
      <span className={`bcms-whitespace-nowrap bcms-transition-opacity ${collapsed ? 'bcms-opacity-0 bcms-w-0' : 'bcms-opacity-100'}`}>
        {label}
      </span>
    </button>
  );

  return (
    <div
      className="bcms-flex bcms-flex-col bcms-h-screen bcms-bg-gray-900 bcms-text-white bcms-transition-all bcms-duration-300 bcms-overflow-hidden"
      style={{ width: collapsed ? 80 : 256 }}
      onMouseEnter={() => setCollapsed(false)}
      onMouseLeave={() => setCollapsed(true)}
    >
      {/* Logo */}
      <div className="bcms-h-16 bcms-p-4 bcms-border-b bcms-border-white/10 bcms-flex bcms-items-center bcms-justify-center">
        {collapsed ? (
          <span className="bcms-text-xl bcms-font-bold">{(branding.businessName || 'CMS')[0]}</span>
        ) : (
          <span className="bcms-text-lg bcms-font-bold">{branding.businessName || 'CMS'}</span>
        )}
      </div>

      {/* Nav */}
      <nav className="bcms-flex-1 bcms-p-3 bcms-overflow-y-auto bcms-overflow-x-hidden bcms-space-y-1">
        {/* Content Section */}
        <button
          onClick={() => setContentExpanded(!contentExpanded)}
          className="bcms-w-full bcms-flex bcms-items-center bcms-gap-3 bcms-px-4 bcms-py-2 bcms-rounded-lg bcms-text-gray-300 hover:bcms-bg-white/10 hover:bcms-text-white bcms-transition bcms-text-sm"
        >
          <FileText className="bcms-w-4 bcms-h-4 bcms-flex-shrink-0" />
          <span className={`bcms-flex-1 bcms-text-left bcms-whitespace-nowrap bcms-transition-opacity ${collapsed ? 'bcms-opacity-0 bcms-w-0' : 'bcms-opacity-100'}`}>
            Content
          </span>
          {!collapsed && (contentExpanded ? <ChevronDown className="bcms-w-3 bcms-h-3 bcms-opacity-60" /> : <ChevronRight className="bcms-w-3 bcms-h-3 bcms-opacity-60" />)}
        </button>

        {contentExpanded && !collapsed && (
          <div className="bcms-space-y-1">
            {models.map((m) => (
              <NavButton
                key={m.id}
                active={isModelActive(m.id)}
                icon={File}
                label={m.name}
                onClick={() => onNavigate({ page: 'content-entries', modelId: m.id })}
                sub
              />
            ))}
          </div>
        )}

        <NavButton active={isActive('content-models')} icon={Database} label="Content Models" onClick={() => onNavigate({ page: 'content-models' })} />
        <NavButton active={isActive('media')} icon={Images} label="Media" onClick={() => onNavigate({ page: 'media' })} />
        <NavButton active={isActive('settings')} icon={Settings} label="Settings" onClick={() => onNavigate({ page: 'settings' })} />

        {/* Custom sidebar items */}
        {config.sidebarItems?.filter((s) => s.position !== 'bottom').map((item) => (
          <NavButton
            key={item.id}
            active={currentRoute.page === 'custom' && (currentRoute as any).path === item.path}
            icon={() => <span>{item.icon || '📄'}</span>}
            label={item.label}
            onClick={() => onNavigate({ page: 'custom', path: item.path })}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="bcms-p-3 bcms-border-t bcms-border-white/10">
        {!collapsed && user && (
          <div className="bcms-text-xs bcms-text-gray-400 bcms-px-4 bcms-mb-2 bcms-truncate">{user.email}</div>
        )}
        <button
          onClick={logout}
          className="bcms-w-full bcms-flex bcms-items-center bcms-gap-3 bcms-px-4 bcms-py-2 bcms-rounded-lg bcms-text-gray-300 hover:bcms-bg-white/10 hover:bcms-text-white bcms-transition bcms-text-sm"
          title={collapsed ? 'Sign Out' : ''}
        >
          <LogOut className="bcms-w-4 bcms-h-4 bcms-flex-shrink-0" />
          <span className={`bcms-whitespace-nowrap bcms-transition-opacity ${collapsed ? 'bcms-opacity-0 bcms-w-0' : 'bcms-opacity-100'}`}>
            Sign Out
          </span>
        </button>
      </div>
    </div>
  );
}
