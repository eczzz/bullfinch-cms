import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useSupabase } from '../provider';
import { fetchUsers } from '../../core/queries';
import { UserEditor } from './UserEditor';
import { formatDate } from '../../core/helpers';
import type { User } from '../../core/types';

const ROLE_BADGE_STYLES: Record<string, string> = {
  Admin: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
  Editor: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  Viewer: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
};

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

  useEffect(() => {
    loadUsers();
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-4 rounded-lg border border-gray-100">
            <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/3 rounded bg-gray-200 animate-pulse" />
              <div className="h-2 w-1/2 rounded bg-gray-200 animate-pulse" />
            </div>
            <div className="h-5 w-14 rounded-full bg-gray-200 animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Team Members</h2>
          <p className="text-xs text-gray-500 mt-0.5">{users.length} member{users.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => {
            setSelectedUser(null);
            setIsEditorOpen(true);
          }}
          className="inline-flex items-center gap-2 cms-btn-accent text-white rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Table */}
      {users.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-200 p-12 text-center">
          <p className="text-sm text-gray-500">No team members yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Joined
                </th>
                <th className="text-right px-5 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider w-20">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                        {(u.first_name?.[0] || u.email[0]).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {u.first_name || u.last_name
                          ? `${u.first_name} ${u.last_name}`.trim()
                          : 'No name'}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500">{u.email}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        ROLE_BADGE_STYLES[u.role] || ROLE_BADGE_STYLES.Viewer
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-500">{formatDate(u.created_at)}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setSelectedUser(u);
                          setIsEditorOpen(true);
                        }}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
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
        onSave={() => {
          loadUsers();
          setIsEditorOpen(false);
        }}
      />
    </div>
  );
}
