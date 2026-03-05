import React, { useState } from 'react';
import { useCMS } from './provider';
import { Login } from './auth/Login';
import { MainLayout } from './layout/MainLayout';
import { ContentModelsList } from './content/ContentModelsList';
import { ContentModelEditor } from './content/ContentModelEditor';
import { ContentEntriesList } from './content/ContentEntriesList';
import { ContentEntryEditor } from './content/ContentEntryEditor';
import { Media } from './media/Media';
import { Settings } from './settings/Settings';
import type { CMSRoute } from '../core/types';

export function AdminPanel() {
  const { isAuthenticated, isLoading, config } = useCMS();
  const [route, setRoute] = useState<CMSRoute>({ page: 'content-models' });

  if (isLoading) {
    return (
      <div className="bcms-flex bcms-items-center bcms-justify-center bcms-h-screen bcms-bg-gray-50">
        <div className="bcms-animate-spin bcms-w-8 bcms-h-8 bcms-border-4 bcms-border-blue-600 bcms-border-t-transparent bcms-rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const renderView = () => {
    switch (route.page) {
      case 'content-models':
        return <ContentModelsList onNavigate={setRoute} />;

      case 'content-model-editor':
        return <ContentModelEditor modelId={route.id} onNavigate={setRoute} />;

      case 'content-entries':
        return <ContentEntriesList modelId={route.modelId} onNavigate={setRoute} />;

      case 'content-entry-editor':
        return (
          <ContentEntryEditor
            modelId={route.modelId}
            entryId={route.entryId}
            onNavigate={setRoute}
          />
        );

      case 'media':
        return <Media />;

      case 'settings':
      case 'users':
      case 'change-password':
        return <Settings onNavigate={setRoute} />;

      case 'custom': {
        const customItem = config.sidebarItems?.find((s) => s.path === route.path);
        if (customItem) {
          const CustomComponent = customItem.component;
          return <CustomComponent />;
        }
        return <div className="bcms-p-8 bcms-text-gray-500">Page not found</div>;
      }

      default:
        return <ContentModelsList onNavigate={setRoute} />;
    }
  };

  return (
    <MainLayout currentRoute={route} onNavigate={setRoute}>
      {renderView()}
    </MainLayout>
  );
}
