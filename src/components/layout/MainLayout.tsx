import React from 'react';
import { Sidebar } from './Sidebar';
import type { CMSRoute } from '../../core/types';

interface MainLayoutProps {
  currentRoute: CMSRoute;
  onNavigate: (route: CMSRoute) => void;
  children: React.ReactNode;
}

export function MainLayout({ currentRoute, onNavigate, children }: MainLayoutProps) {
  return (
    <div className="bcms-flex bcms-h-screen bcms-bg-gray-50">
      <Sidebar currentRoute={currentRoute} onNavigate={onNavigate} />
      <main className="bcms-flex-1 bcms-overflow-auto">{children}</main>
    </div>
  );
}
