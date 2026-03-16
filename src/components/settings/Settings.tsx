import React, { useState, useEffect } from 'react';
import { Save, User, Lock, Users, Palette, Plug, Eye, EyeOff } from 'lucide-react';
import { useCMS, useSupabase } from '../provider';
import { navigate } from '../../core/router';
import { ChangePassword } from './ChangePassword';
import { UserManagement } from './UserManagement';
import { Toast } from '../common/Toast';

type SettingsTab = 'general' | 'branding' | 'integrations' | 'users' | 'password';

function getTabFromPath(): SettingsTab {
  const pathname = window.location.pathname;
  if (pathname.includes('/settings/branding')) return 'branding';
  if (pathname.includes('/settings/integrations')) return 'integrations';
  if (pathname.includes('/settings/users')) return 'users';
  if (pathname.includes('/settings/password')) return 'password';
  return 'general';
}

export function Settings() {
  const supabase = useSupabase();
  const { refreshBranding } = useCMS();
  const [activeTab, setActiveTab] = useState<SettingsTab>(getTabFromPath);
  const [settings, setSettings] = useState<Record<string, string>>({
    site_name: '',
    site_description: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    branding_icon: '',
    branding_favicon: '',
    branding_logo: '',
    branding_primary_color: '',
    branding_accent_color: '',
    branding_sidebar_bg: '',
    branding_sidebar_text: '',
    integration_r2_account_id: '',
    integration_r2_access_key_id: '',
    integration_r2_secret_access_key: '',
    integration_r2_bucket_name: '',
    integration_r2_public_url: '',
    integration_netlify_build_hook: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; title: string; message?: string } | null>(null);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [triggeringBuild, setTriggeringBuild] = useState(false);

  // Listen for popstate to sync tab
  useEffect(() => {
    const onPopState = () => setActiveTab(getTabFromPath());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase.from('settings').select('*');
      if (error) throw error;
      const map: Record<string, string> = {};
      data?.forEach((s: any) => {
        map[s.key] = s.value;
      });
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
      await refreshBranding();
      setToast({ type: 'success', title: 'Settings saved' });
    } catch (err: any) {
      setToast({ type: 'error', title: 'Save failed', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerBuild = async () => {
    const hookUrl = settings.integration_netlify_build_hook;
    if (!hookUrl) {
      setToast({ type: 'error', title: 'No build hook URL configured' });
      return;
    }
    setTriggeringBuild(true);
    try {
      const res = await fetch(hookUrl, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setToast({ type: 'success', title: 'Build triggered successfully' });
    } catch (err: any) {
      setToast({ type: 'error', title: 'Build trigger failed', message: err.message });
    } finally {
      setTriggeringBuild(false);
    }
  };

  const handleTabClick = (tab: SettingsTab) => {
    if (tab === 'general') navigate('/settings');
    else if (tab === 'branding') navigate('/settings/branding');
    else if (tab === 'integrations') navigate('/settings/integrations');
    else if (tab === 'users') navigate('/settings/users');
    else if (tab === 'password') navigate('/settings/password');
  };

  const tabs: Array<{ id: SettingsTab; label: string; icon: typeof User }> = [
    { id: 'general', label: 'General', icon: User },
    { id: 'branding', label: 'Branding', icon: Palette },
    { id: 'integrations', label: 'Integrations', icon: Plug },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'password', label: 'Password', icon: Lock },
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account and system configuration</p>
      </div>

      {/* Tab navigation — underline style */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'border-transparent text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              style={activeTab === tab.id ? { borderColor: 'var(--cms-accent)', color: 'var(--cms-accent)' } : undefined}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          {/* General Information card */}
          <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">General Information</h2>
              <p className="text-xs text-gray-500 mt-0.5">Basic details about your business</p>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Business Name</label>
                <input
                  type="text"
                  value={settings.site_name || ''}
                  onChange={(e) => setSettings((p) => ({ ...p, site_name: e.target.value }))}
                  placeholder="Your business name"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea
                  value={settings.site_description || ''}
                  onChange={(e) => setSettings((p) => ({ ...p, site_description: e.target.value }))}
                  rows={3}
                  placeholder="A brief description of your site"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                />
              </div>
            </div>
          </div>

          {/* Contact Information card */}
          <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Contact Information</h2>
              <p className="text-xs text-gray-500 mt-0.5">How people can reach you</p>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={settings.contact_email || ''}
                    onChange={(e) => setSettings((p) => ({ ...p, contact_email: e.target.value }))}
                    placeholder="contact@example.com"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                  <input
                    type="text"
                    value={settings.contact_phone || ''}
                    onChange={(e) => setSettings((p) => ({ ...p, contact_phone: e.target.value }))}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                <textarea
                  value={settings.address || ''}
                  onChange={(e) => setSettings((p) => ({ ...p, address: e.target.value }))}
                  rows={2}
                  placeholder="Business address"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                />
              </div>
            </div>
          </div>

          {/* Save button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 cms-btn-accent text-white rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'branding' && (
        <div className="space-y-6">
          {/* Logo & Icons card */}
          <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Logo & Icons</h2>
              <p className="text-xs text-gray-500 mt-0.5">Brand imagery for your CMS</p>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Icon URL</label>
                <div className="flex items-center gap-3">
                  {settings.branding_icon && (
                    <img src={settings.branding_icon} alt="Icon preview" className="w-8 h-8 rounded object-contain border border-gray-200" />
                  )}
                  <input
                    type="text"
                    value={settings.branding_icon || ''}
                    onChange={(e) => setSettings((p) => ({ ...p, branding_icon: e.target.value }))}
                    placeholder="https://example.com/icon.png"
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Favicon URL</label>
                <div className="flex items-center gap-3">
                  {settings.branding_favicon && (
                    <img src={settings.branding_favicon} alt="Favicon preview" className="w-8 h-8 rounded object-contain border border-gray-200" />
                  )}
                  <input
                    type="text"
                    value={settings.branding_favicon || ''}
                    onChange={(e) => setSettings((p) => ({ ...p, branding_favicon: e.target.value }))}
                    placeholder="https://example.com/favicon.ico"
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Logo URL</label>
                <div className="flex items-center gap-3">
                  {settings.branding_logo && (
                    <img src={settings.branding_logo} alt="Logo preview" className="max-h-10 rounded object-contain border border-gray-200" />
                  )}
                  <input
                    type="text"
                    value={settings.branding_logo || ''}
                    onChange={(e) => setSettings((p) => ({ ...p, branding_logo: e.target.value }))}
                    placeholder="https://example.com/logo.png"
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Color Scheme card */}
          <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Color Scheme</h2>
              <p className="text-xs text-gray-500 mt-0.5">Customize the look and feel of your CMS</p>
            </div>
            <div className="p-6 space-y-5">
              {([
                ['branding_primary_color', 'Primary Color'],
                ['branding_accent_color', 'Accent Color'],
                ['branding_sidebar_bg', 'Sidebar Background'],
                ['branding_sidebar_text', 'Sidebar Text Color'],
              ] as const).map(([key, label]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                  <div className="flex items-center gap-2">
                    <label className="relative w-8 h-8 rounded-lg border border-gray-300 flex-shrink-0 cursor-pointer overflow-hidden">
                      <input
                        type="color"
                        value={settings[key] || '#ffffff'}
                        onChange={(e) => setSettings((p) => ({ ...p, [key]: e.target.value }))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <span
                        className="block w-full h-full rounded-lg"
                        style={{ backgroundColor: settings[key] || '#ffffff' }}
                      />
                    </label>
                    <input
                      type="text"
                      value={settings[key] || ''}
                      onChange={(e) => setSettings((p) => ({ ...p, [key]: e.target.value }))}
                      placeholder="#000000"
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Save button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 cms-btn-accent text-white rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'integrations' && (
        <div className="space-y-6">
          {/* Cloudflare R2 Storage card */}
          <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Cloudflare R2 Storage</h2>
              <p className="text-xs text-gray-500 mt-0.5">Configure object storage for media files</p>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Account ID</label>
                <input
                  type="text"
                  value={settings.integration_r2_account_id || ''}
                  onChange={(e) => setSettings((p) => ({ ...p, integration_r2_account_id: e.target.value }))}
                  placeholder="Cloudflare Account ID"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Access Key ID</label>
                <input
                  type="text"
                  value={settings.integration_r2_access_key_id || ''}
                  onChange={(e) => setSettings((p) => ({ ...p, integration_r2_access_key_id: e.target.value }))}
                  placeholder="Access Key ID"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Secret Access Key</label>
                <div className="relative">
                  <input
                    type={showSecretKey ? 'text' : 'password'}
                    value={settings.integration_r2_secret_access_key || ''}
                    onChange={(e) => setSettings((p) => ({ ...p, integration_r2_secret_access_key: e.target.value }))}
                    placeholder="Secret Access Key"
                    className="w-full px-3 py-2 pr-10 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecretKey(!showSecretKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Bucket Name</label>
                <input
                  type="text"
                  value={settings.integration_r2_bucket_name || ''}
                  onChange={(e) => setSettings((p) => ({ ...p, integration_r2_bucket_name: e.target.value }))}
                  placeholder="my-bucket"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Public URL / Custom Domain</label>
                <input
                  type="text"
                  value={settings.integration_r2_public_url || ''}
                  onChange={(e) => setSettings((p) => ({ ...p, integration_r2_public_url: e.target.value }))}
                  placeholder="https://media.example.com"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <p className="text-xs text-gray-400">R2 credentials are stored in your database. For production, consider using environment variables.</p>
            </div>
          </div>

          {/* Netlify Build Hook card */}
          <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Netlify Build Hook</h2>
              <p className="text-xs text-gray-500 mt-0.5">Trigger deploys when content changes</p>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Build Hook URL</label>
                <input
                  type="text"
                  value={settings.integration_netlify_build_hook || ''}
                  onChange={(e) => setSettings((p) => ({ ...p, integration_netlify_build_hook: e.target.value }))}
                  placeholder="https://api.netlify.com/build_hooks/..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleTriggerBuild}
                  disabled={triggeringBuild}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {triggeringBuild ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                      Triggering…
                    </>
                  ) : (
                    'Trigger Build'
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-400">Build hooks trigger a new deploy on Netlify when content is published.</p>
            </div>
          </div>

          {/* Save button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 cms-btn-accent text-white rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'users' && <UserManagement />}
      {activeTab === 'password' && <ChangePassword />}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
