import React, { useState, useEffect } from 'react';
import { Save, User, Lock, Users, Palette } from 'lucide-react';
import { useSupabase } from '../provider';
import { ChangePassword } from './ChangePassword';
import { UserManagement } from './UserManagement';
import { Toast } from '../common/Toast';
import type { CMSRoute } from '../../core/types';

type SettingsTab = 'profile' | 'password' | 'users' | 'branding';

interface SettingsProps {
  onNavigate?: (route: CMSRoute) => void;
}

export function Settings({ onNavigate }: SettingsProps) {
  const supabase = useSupabase();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [settings, setSettings] = useState<Record<string, string>>({
    site_name: '',
    site_description: '',
    contact_email: '',
    contact_phone: '',
    address: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; title: string; message?: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase.from('settings').select('*');
      if (error) throw error;
      const map: Record<string, string> = {};
      data?.forEach((s: any) => { map[s.key] = s.value; });
      setSettings((prev) => ({ ...prev, ...map }));
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(settings)) {
        const { error } = await supabase
          .from('settings')
          .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
        if (error) throw error;
      }
      setToast({ type: 'success', title: 'Settings saved' });
    } catch (err: any) {
      setToast({ type: 'error', title: 'Save failed', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'profile' as SettingsTab, label: 'Profile Settings', icon: User },
    { id: 'password' as SettingsTab, label: 'Change Password', icon: Lock },
    { id: 'users' as SettingsTab, label: 'User Management', icon: Users },
  ];

  return (
    <div className="bcms-p-8 bcms-max-w-4xl">
      <div className="bcms-mb-8">
        <h1 className="bcms-text-2xl bcms-font-bold bcms-text-gray-900">Settings</h1>
        <p className="bcms-text-gray-500 bcms-text-sm bcms-mt-1">Manage your account and system configuration</p>
      </div>

      {/* Tabs */}
      <div className="bcms-flex bcms-gap-6 bcms-border-b bcms-border-gray-200 bcms-mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`bcms-flex bcms-items-center bcms-gap-2 bcms-pb-3 bcms-text-sm bcms-font-medium bcms-border-b-2 bcms-transition ${
              activeTab === tab.id
                ? 'bcms-border-blue-600 bcms-text-blue-600'
                : 'bcms-border-transparent bcms-text-gray-500 hover:bcms-text-gray-700'
            }`}
          >
            <tab.icon className="bcms-w-4 bcms-h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'profile' && (
        <div className="bcms-space-y-6">
          <div className="bcms-bg-white bcms-rounded-xl bcms-shadow-sm bcms-border bcms-border-gray-200 bcms-p-6 bcms-space-y-5">
            <h2 className="bcms-text-sm bcms-font-semibold bcms-text-gray-900">General Information</h2>
            {(['site_name', 'site_description', 'contact_email', 'contact_phone', 'address'] as const).map((key) => (
              <div key={key}>
                <label className="bcms-block bcms-text-sm bcms-font-medium bcms-text-gray-700 bcms-mb-1 bcms-capitalize">
                  {key.replace(/_/g, ' ')}
                </label>
                {key === 'site_description' || key === 'address' ? (
                  <textarea
                    value={settings[key] || ''}
                    onChange={(e) => setSettings((p) => ({ ...p, [key]: e.target.value }))}
                    rows={3}
                    className="bcms-w-full bcms-px-4 bcms-py-2 bcms-text-sm bcms-border bcms-border-gray-300 bcms-rounded-lg bcms-resize-none"
                  />
                ) : (
                  <input
                    type={key === 'contact_email' ? 'email' : 'text'}
                    value={settings[key] || ''}
                    onChange={(e) => setSettings((p) => ({ ...p, [key]: e.target.value }))}
                    className="bcms-w-full bcms-px-4 bcms-py-2 bcms-text-sm bcms-border bcms-border-gray-300 bcms-rounded-lg"
                  />
                )}
              </div>
            ))}
          </div>
          <div className="bcms-flex bcms-justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bcms-bg-blue-600 bcms-text-white bcms-py-2.5 bcms-px-6 bcms-text-sm bcms-font-semibold bcms-rounded-lg hover:bcms-bg-blue-700 bcms-transition bcms-flex bcms-items-center bcms-gap-2 disabled:bcms-opacity-50"
            >
              <Save className="bcms-w-4 bcms-h-4" /> {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'password' && <ChangePassword />}
      {activeTab === 'users' && <UserManagement />}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
