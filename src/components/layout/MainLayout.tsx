import React from 'react';
import { Sidebar } from './Sidebar';
import type { CMSRoute } from '../../core/types';

interface MainLayoutProps {
  currentRoute: CMSRoute;
  children: React.ReactNode;
}

export function MainLayout({ currentRoute, children }: MainLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar currentRoute={currentRoute} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
