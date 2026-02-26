'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Pencil, Trash2, Shield, X } from 'lucide-react';

interface User {
  id: string;
  username: string;
  role: 'admin' | 'deployer' | 'viewer';
  twoFactorEnabled: boolean;
  createdAt: string;
}

interface UserForm {
  id?: string;
  username: string;
  password: string;
  role: 'admin' | 'deployer' | 'viewer';
}

const roleBadge: Record<string, string> = {
  admin: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  deployer: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  viewer: 'border-zinc-500/30 bg-zinc-500/10 text-zinc-400',
};

const emptyForm: UserForm = { username: '', password: '', role: 'viewer' };

export default function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users/list');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(data.users);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  function openCreate() {
    setForm(emptyForm);
    setModal('create');
  }

  function openEdit(user: User) {
    setForm({ id: user.id, username: user.username, password: '', role: user.role });
    setModal('edit');
  }

  async function handleSave() {
    if (!form.username) return;
    if (modal === 'create' && !form.password) return;
    setSaving(true);
    setError(null);
    try {
      const url = modal === 'create' ? '/api/users/create' : '/api/users/update';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setModal(null);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save user');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch('/api/users/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDeleteId(null);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
      setDeleteId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <Users size={18} />
          <h2 className="text-sm font-semibold">User Management</h2>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Add User</span>
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="grid grid-cols-[1fr_90px_80px_120px_90px] gap-4 border-b border-white/10 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
          <div>Username</div>
          <div className="text-center">Role</div>
          <div className="text-center">2FA</div>
          <div className="text-center">Created</div>
          <div className="text-center">Actions</div>
        </div>

        {loading ? (
          <div className="space-y-1 p-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-white/5" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-zinc-500">No users found</div>
        ) : (
          <div>
            {users.map((user) => (
              <div
                key={user.id}
                className="grid grid-cols-[1fr_90px_80px_120px_90px] items-center gap-4 border-b border-white/5 px-4 py-2.5 text-sm text-zinc-300 last:border-0 hover:bg-white/[0.02]"
              >
                <div className="flex items-center gap-2 truncate font-medium text-white">
                  <Shield size={14} className="shrink-0 text-zinc-500" />
                  {user.username}
                </div>
                <div className="flex justify-center">
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${roleBadge[user.role]}`}>
                    {user.role}
                  </span>
                </div>
                <div className="text-center">
                  {user.twoFactorEnabled ? (
                    <span className="text-xs text-emerald-400">Enabled</span>
                  ) : (
                    <span className="text-xs text-zinc-500">Off</span>
                  )}
                </div>
                <div className="text-center text-xs text-zinc-500">
                  {new Date(user.createdAt).toLocaleDateString()}
                </div>
                <div className="flex items-center justify-center gap-1">
                  <button
                    onClick={() => openEdit(user)}
                    className="rounded-md p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"
                    title="Edit user"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteId(user.id)}
                    className="rounded-md p-1.5 text-zinc-400 hover:bg-red-500/10 hover:text-red-400"
                    title="Delete user"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-xs text-zinc-500">{users.length} user{users.length !== 1 ? 's' : ''}</div>

      {/* Create / Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#0f0f0f] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h3 className="text-sm font-semibold text-white">
                {modal === 'create' ? 'Add User' : 'Edit User'}
              </h3>
              <button onClick={() => setModal(null)} className="rounded-md p-1 text-zinc-400 hover:bg-white/10 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Username</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="Enter username"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                  Password{modal === 'edit' ? ' (leave blank to keep current)' : ''}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={modal === 'edit' ? 'Unchanged' : 'Enter password'}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as UserForm['role'] })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                >
                  <option value="admin">Admin</option>
                  <option value="deployer">Deployer</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-white/10 px-5 py-4">
              <button
                onClick={() => setModal(null)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-400 hover:bg-white/5 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.username || (modal === 'create' && !form.password)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : modal === 'create' ? 'Create User' : 'Update User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-white/10 bg-[#0f0f0f] shadow-2xl">
            <div className="p-5 text-center">
              <Trash2 size={32} className="mx-auto mb-3 text-red-400" />
              <h3 className="mb-1 text-sm font-semibold text-white">Delete User</h3>
              <p className="text-xs text-zinc-400">Are you sure? This action cannot be undone.</p>
            </div>
            <div className="flex justify-end gap-2 border-t border-white/10 px-5 py-4">
              <button
                onClick={() => setDeleteId(null)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-400 hover:bg-white/5 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
