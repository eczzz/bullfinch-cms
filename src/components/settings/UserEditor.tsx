import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Shield, Pencil, Eye } from 'lucide-react';
import { useSupabase } from '../provider';
import { updateUser } from '../../core/queries';
import { ConfirmationModal } from '../common/ConfirmationModal';
import type { User, UserRole } from '../../core/types';

interface UserEditorProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const ROLES: Array<{ value: UserRole; label: string; description: string; icon: typeof Shield; badgeClass: string }> = [
  {
    value: 'Admin',
    label: 'Admin',
    description: 'Full access to all settings and content',
    icon: Shield,
    badgeClass: 'bg-purple-50 text-purple-700 ring-purple-200 peer-checked:ring-purple-500',
  },
  {
    value: 'Editor',
    label: 'Editor',
    description: 'Can create and edit content',
    icon: Pencil,
    badgeClass: 'bg-blue-50 text-blue-700 ring-blue-200 peer-checked:ring-blue-500',
  },
  {
    value: 'Viewer',
    label: 'Viewer',
    description: 'Read-only access to content',
    icon: Eye,
    badgeClass: 'bg-gray-50 text-gray-600 ring-gray-200 peer-checked:ring-gray-500',
  },
];

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
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
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
        if (!password || password.length < 8) {
          setError('Password must be at least 8 characters');
          setSaving(false);
          return;
        }
        const schema = (supabase as any).rest?.schemaName as string | undefined;
        const { data, error: invokeError } = await supabase.functions.invoke('admin-create-user', {
          body: {
            email,
            password,
            first_name: firstName,
            last_name: lastName,
            phone_number: phoneNumber,
            role,
            schema: schema || 'public',
          },
        });
        if (invokeError) {
          // supabase-js wraps non-2xx responses; the server's JSON error is on `context`.
          const ctx: any = (invokeError as any).context;
          let message = invokeError.message;
          try {
            const body = await ctx?.json?.();
            if (body?.error) message = body.error;
          } catch {}
          throw new Error(message);
        }
        if (data?.error) throw new Error(data.error);
      }
      onSave();
    } catch (err: any) {
      setError(err.message || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('users').delete().eq('id', user.id);
      if (error) throw error;
      setShowDeleteConfirm(false);
      onSave();
    } catch (err: any) {
      setError(err.message || 'Delete failed');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-lg w-full max-w-md border border-gray-200 animate-fade-in-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              {user ? 'Edit User' : 'Invite User'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {user ? 'Update user details and role' : 'Add a new team member'}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 transition-all">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="flex gap-3 p-3 rounded-lg bg-red-50 border border-red-200/60">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!!user}
              placeholder="user@example.com"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </div>

          {/* Role selector — radio-style cards */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <div className="space-y-2">
              {ROLES.map((r) => {
                const isSelected = role === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg ring-1 transition-all flex items-center gap-3 ${
                      isSelected
                        ? 'ring-2 ring-blue-500 bg-blue-50/50'
                        : 'ring-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        r.value === 'Admin'
                          ? 'bg-purple-100 text-purple-600'
                          : r.value === 'Editor'
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      <r.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{r.label}</p>
                      <p className="text-xs text-gray-500">{r.description}</p>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                        isSelected ? 'border-blue-600 cms-accent-bg' : 'border-gray-300'
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {!user && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
              <p className="mt-1.5 text-xs text-gray-400">Must be at least 8 characters</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <div>
            {user && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={saving}
                className="inline-flex items-center gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg px-3 py-2 text-sm font-medium transition-all disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg px-4 py-2 text-sm font-medium transition-all"
            >
              Cancel
            </button>
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
                  {user ? 'Save Changes' : 'Create User'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title="Delete User"
        message={`Are you sure you want to delete ${firstName || email || 'this user'}? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
