import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { useSupabase } from '../provider';
import { Toast } from '../common/Toast';

export function ChangePassword() {
  const supabase = useSupabase();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; title: string; message?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setToast({ type: 'error', title: 'Passwords do not match' });
      return;
    }
    if (newPassword.length < 8) {
      setToast({ type: 'error', title: 'Password must be at least 8 characters' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setToast({ type: 'success', title: 'Password updated' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setToast({ type: 'error', title: 'Update failed', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bcms-space-y-6">
      <div className="bcms-bg-white bcms-rounded-xl bcms-shadow-sm bcms-border bcms-border-gray-200 bcms-overflow-hidden">
        <div className="bcms-px-6 bcms-py-5 bcms-border-b bcms-border-gray-200 bcms-bg-gray-50">
          <h2 className="bcms-text-sm bcms-font-semibold bcms-text-gray-900">Security Settings</h2>
          <p className="bcms-text-xs bcms-text-gray-500 bcms-mt-1">Update your password</p>
        </div>
        <form onSubmit={handleSubmit} className="bcms-p-6 bcms-space-y-5">
          <div>
            <label className="bcms-block bcms-text-sm bcms-font-medium bcms-text-gray-700 bcms-mb-1">New Password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="bcms-w-full bcms-px-4 bcms-py-2.5 bcms-text-sm bcms-border bcms-border-gray-300 bcms-rounded-lg" placeholder="Min 8 characters" />
          </div>
          <div>
            <label className="bcms-block bcms-text-sm bcms-font-medium bcms-text-gray-700 bcms-mb-1">Confirm Password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="bcms-w-full bcms-px-4 bcms-py-2.5 bcms-text-sm bcms-border bcms-border-gray-300 bcms-rounded-lg" />
          </div>
          <button type="submit" disabled={saving} className="bcms-w-full bcms-bg-blue-600 bcms-text-white bcms-py-2.5 bcms-text-sm bcms-font-semibold bcms-rounded-lg hover:bcms-bg-blue-700 bcms-transition bcms-flex bcms-items-center bcms-justify-center bcms-gap-2 disabled:bcms-opacity-50">
            <Save className="bcms-w-4 bcms-h-4" /> {saving ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
