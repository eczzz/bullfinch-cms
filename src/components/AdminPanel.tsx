import React from 'react';
import { useCMS } from './provider';
import { Login } from './auth/Login';
import { MainLayout } from './layout/MainLayout';
import { ContentModelsList } from './content/ContentModelsList';
import { ContentModelEditor } from './content/ContentModelEditor';
import { ContentEntriesList } from './content/ContentEntriesList';
import { ContentEntryEditor } from './content/ContentEntryEditor';
import { Media } from './media/Media';
import { Settings } from './settings/Settings';
import { useRouter, navigate, routeToPath } from '../core/router';
import type { CMSRoute } from '../core/types';

export function AdminPanel() {
  const { isAuthenticated, isLoading, config } = useCMS();
  const { route } = useRouter();

  // Bridge: convert CMSRoute-based onNavigate calls to hash navigation
  const onNavigate = (r: CMSRoute) => navigate(routeToPath(r));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const renderView = () => {
    switch (route.page) {
      case 'content-models':
        return <ContentModelsList />;

      case 'content-model-editor':
        return <ContentModelEditor modelId={route.id} />;

      case 'entries':
        return <ContentEntriesList modelId={route.modelId} />;

      case 'content-entries':
        return <ContentEntriesList modelId={route.modelId} />;

      case 'content-entry-editor':
        return (
          <ContentEntryEditor
            modelId={route.modelId}
            entryId={route.entryId}
          />
        );

      case 'media':
        return <Media />;

      case 'settings':
      case 'users':
      case 'change-password':
        return <Settings />;

      case 'custom': {
        const customItem = config.sidebarItems?.find((s) => s.path === route.path);
        if (customItem) {
          const CustomComponent = customItem.component;
          return <CustomComponent />;
        }
        return <div className="p-8 text-gray-500">Page not found</div>;
      }

      default:
        return <ContentModelsList />;
    }
  };

  return (
    <MainLayout currentRoute={route}>
      {renderView()}
    </MainLayout>
  );
}
