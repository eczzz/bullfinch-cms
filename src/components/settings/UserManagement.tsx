import React, { useEffect, useState } from 'react';
import { Plus, Pencil } from 'lucide-react';
import { useSupabase } from '../provider';
import { fetchUsers } from '../../core/queries';
import { UserEditor } from './UserEditor';
import { formatDate } from '../../core/helpers';
import type { User } from '../../core/types';

export function UserManagement() {
  const supabase = useSupabase();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const loadUsers = async () => {
    try {
      const data = await fetchUsers(supabase);
      setUsers(data);
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  if (loading) {
    return (
      <div className="bcms-space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bcms-h-16 bcms-bg-gray-200 bcms-rounded-lg bcms-animate-pulse" />
        ))}
      </div>
    );
  }

  const roleColors: Record<string, string> = {
    Admin: 'bcms-bg-purple-100 bcms-text-purple-700',
    Editor: 'bcms-bg-blue-100 bcms-text-blue-700',
    Viewer: 'bcms-bg-gray-100 bcms-text-gray-600',
  };

  return (
    <div className="bcms-space-y-6">
      <div className="bcms-flex bcms-items-center bcms-justify-between">
        <h2 className="bcms-text-lg bcms-font-semibold bcms-text-gray-900">Team Members</h2>
        <button
          onClick={() => { setSelectedUser(null); setIsEditorOpen(true); }}
          className="bcms-bg-blue-600 bcms-text-white bcms-py-2 bcms-px-4 bcms-text-sm bcms-font-semibold bcms-rounded-lg hover:bcms-bg-blue-700 bcms-transition bcms-flex bcms-items-center bcms-gap-2"
        >
          <Plus className="bcms-w-4 bcms-h-4" /> Add User
        </button>
      </div>

      {users.length === 0 ? (
        <div className="bcms-bg-white bcms-rounded-xl bcms-shadow-sm bcms-border bcms-border-gray-200 bcms-p-12 bcms-text-center">
          <p className="bcms-text-gray-500 bcms-text-sm">No users yet.</p>
        </div>
      ) : (
        <div className="bcms-bg-white bcms-rounded-xl bcms-shadow-sm bcms-border bcms-border-gray-200 bcms-overflow-hidden">
          <table className="bcms-w-full">
            <thead className="bcms-bg-gray-50 bcms-border-b bcms-border-gray-200">
              <tr>
                <th className="bcms-text-left bcms-px-6 bcms-py-3 bcms-text-xs bcms-font-semibold bcms-text-gray-500 bcms-uppercase">Name</th>
                <th className="bcms-text-left bcms-px-6 bcms-py-3 bcms-text-xs bcms-font-semibold bcms-text-gray-500 bcms-uppercase">Email</th>
                <th className="bcms-text-left bcms-px-6 bcms-py-3 bcms-text-xs bcms-font-semibold bcms-text-gray-500 bcms-uppercase">Role</th>
                <th className="bcms-text-left bcms-px-6 bcms-py-3 bcms-text-xs bcms-font-semibold bcms-text-gray-500 bcms-uppercase">Joined</th>
                <th className="bcms-text-right bcms-px-6 bcms-py-3 bcms-text-xs bcms-font-semibold bcms-text-gray-500 bcms-uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bcms-divide-y bcms-divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bcms-bg-gray-50 bcms-transition bcms-cursor-pointer" onClick={() => { setSelectedUser(u); setIsEditorOpen(true); }}>
                  <td className="bcms-px-6 bcms-py-4">
                    <div className="bcms-flex bcms-items-center bcms-gap-3">
                      <div className="bcms-w-8 bcms-h-8 bcms-rounded-full bcms-bg-blue-600 bcms-flex bcms-items-center bcms-justify-center bcms-text-white bcms-text-sm bcms-font-semibold">
                        {(u.first_name?.[0] || u.email[0]).toUpperCase()}
                      </div>
                      <span className="bcms-font-medium bcms-text-sm bcms-text-gray-900">
                        {u.first_name || u.last_name ? `${u.first_name} ${u.last_name}`.trim() : 'No name'}
                      </span>
                    </div>
                  </td>
                  <td className="bcms-px-6 bcms-py-4 bcms-text-sm bcms-text-gray-500">{u.email}</td>
                  <td className="bcms-px-6 bcms-py-4">
                    <span className={`bcms-inline-flex bcms-px-2.5 bcms-py-1 bcms-rounded-full bcms-text-xs bcms-font-medium ${roleColors[u.role] || ''}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="bcms-px-6 bcms-py-4 bcms-text-sm bcms-text-gray-500">{formatDate(u.created_at)}</td>
                  <td className="bcms-px-6 bcms-py-4 bcms-text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => { setSelectedUser(u); setIsEditorOpen(true); }}
                      className="bcms-p-2 bcms-text-gray-400 hover:bcms-text-blue-600 hover:bcms-bg-blue-50 bcms-rounded-lg bcms-transition"
                    >
                      <Pencil className="bcms-w-4 bcms-h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <UserEditor
        user={selectedUser}
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSave={() => { loadUsers(); setIsEditorOpen(false); }}
      />
    </div>
  );
}
