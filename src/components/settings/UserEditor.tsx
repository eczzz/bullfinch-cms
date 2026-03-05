import React, { useState, useEffect } from 'react';
import { X, Save, Trash2 } from 'lucide-react';
import { useSupabase } from '../provider';
import { updateUser } from '../../core/queries';
import type { User, UserRole } from '../../core/types';

interface UserEditorProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function UserEditor({ user, isOpen, onClose, onSave }: UserEditorProps) {
  const supabase = useSupabase();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState<UserRole>('Viewer');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setEmail(user.email);
      setFirstName(user.first_name);
      setLastName(user.last_name);
      setPhoneNumber(user.phone_number);
      setRole(user.role);
    } else {
      setEmail('');
      setFirstName('');
      setLastName('');
      setPhoneNumber('');
      setRole('Viewer');
    }
    setPassword('');
    setError('');
  }, [user, isOpen]);

  const handleSave = async () => {
    if (!email.trim()) { setError('Email is required'); return; }
    setSaving(true);
    setError('');

    try {
      if (user) {
        await updateUser(supabase, user.id, {
          first_name: firstName,
          last_name: lastName,
          phone_number: phoneNumber,
          role,
        });
      } else {
        // For new users, we need admin API which isn't available in the package.
        // Create via supabase auth signup
        if (!password || password.length < 8) {
          setError('Password must be at least 8 characters');
          setSaving(false);
          return;
        }
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { first_name: firstName, last_name: lastName, role } },
        });
        if (signUpError) throw signUpError;
      }
      onSave();
    } catch (err: any) {
      setError(err.message || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !confirm('Delete this user?')) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('users').delete().eq('id', user.id);
      if (error) throw error;
      onSave();
    } catch (err: any) {
      setError(err.message || 'Delete failed');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="bcms-fixed bcms-inset-0 bcms-z-50">
      <div className="bcms-fixed bcms-inset-0 bcms-bg-black/50" onClick={onClose} />
      <div className="bcms-fixed bcms-right-0 bcms-top-0 bcms-bottom-0 bcms-w-full bcms-max-w-md bcms-bg-white bcms-shadow-xl bcms-overflow-y-auto">
        <div className="bcms-p-6 bcms-border-b bcms-border-gray-200 bcms-flex bcms-items-center bcms-justify-between">
          <h2 className="bcms-text-lg bcms-font-semibold bcms-text-gray-900">
            {user ? 'Edit User' : 'Add New User'}
          </h2>
          <button onClick={onClose} className="bcms-p-2 hover:bcms-bg-gray-100 bcms-rounded-lg bcms-transition">
            <X className="bcms-w-5 bcms-h-5 bcms-text-gray-400" />
          </button>
        </div>

        <div className="bcms-p-6 bcms-space-y-4">
          {error && (
            <div className="bcms-bg-red-50 bcms-border bcms-border-red-200 bcms-text-red-700 bcms-px-4 bcms-py-3 bcms-rounded-lg bcms-text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="bcms-block bcms-text-sm bcms-font-medium bcms-text-gray-700 bcms-mb-1">Email *</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!!user} className="bcms-w-full bcms-px-4 bcms-py-2 bcms-text-sm bcms-border bcms-border-gray-300 bcms-rounded-lg disabled:bcms-bg-gray-100" />
          </div>
          <div>
            <label className="bcms-block bcms-text-sm bcms-font-medium bcms-text-gray-700 bcms-mb-1">First Name</label>
            <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="bcms-w-full bcms-px-4 bcms-py-2 bcms-text-sm bcms-border bcms-border-gray-300 bcms-rounded-lg" />
          </div>
          <div>
            <label className="bcms-block bcms-text-sm bcms-font-medium bcms-text-gray-700 bcms-mb-1">Last Name</label>
            <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="bcms-w-full bcms-px-4 bcms-py-2 bcms-text-sm bcms-border bcms-border-gray-300 bcms-rounded-lg" />
          </div>
          <div>
            <label className="bcms-block bcms-text-sm bcms-font-medium bcms-text-gray-700 bcms-mb-1">Phone</label>
            <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="bcms-w-full bcms-px-4 bcms-py-2 bcms-text-sm bcms-border bcms-border-gray-300 bcms-rounded-lg" />
          </div>
          <div>
            <label className="bcms-block bcms-text-sm bcms-font-medium bcms-text-gray-700 bcms-mb-1">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="bcms-w-full bcms-px-4 bcms-py-2 bcms-text-sm bcms-border bcms-border-gray-300 bcms-rounded-lg">
              <option value="Viewer">Viewer</option>
              <option value="Editor">Editor</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          {!user && (
            <div>
              <label className="bcms-block bcms-text-sm bcms-font-medium bcms-text-gray-700 bcms-mb-1">Password *</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bcms-w-full bcms-px-4 bcms-py-2 bcms-text-sm bcms-border bcms-border-gray-300 bcms-rounded-lg" placeholder="Min 8 characters" />
            </div>
          )}
        </div>

        <div className="bcms-p-6 bcms-border-t bcms-border-gray-200 bcms-space-y-3">
          <button onClick={handleSave} disabled={saving} className="bcms-w-full bcms-bg-blue-600 bcms-text-white bcms-py-2.5 bcms-text-sm bcms-font-semibold bcms-rounded-lg hover:bcms-bg-blue-700 bcms-transition bcms-flex bcms-items-center bcms-justify-center bcms-gap-2 disabled:bcms-opacity-50">
            <Save className="bcms-w-4 bcms-h-4" /> {saving ? 'Saving...' : 'Save'}
          </button>
          {user && (
            <button onClick={handleDelete} disabled={saving} className="bcms-w-full bcms-bg-red-600 bcms-text-white bcms-py-2.5 bcms-text-sm bcms-rounded-lg hover:bcms-bg-red-700 bcms-transition bcms-flex bcms-items-center bcms-justify-center bcms-gap-2 disabled:bcms-opacity-50">
              <Trash2 className="bcms-w-4 bcms-h-4" /> Delete User
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
