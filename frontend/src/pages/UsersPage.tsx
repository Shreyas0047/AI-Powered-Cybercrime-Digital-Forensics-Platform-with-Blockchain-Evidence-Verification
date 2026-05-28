import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';
import type { User, UserRole } from '../types';
import { Users, Plus, Edit2, Trash2, Search, ChevronLeft, ChevronRight, X, Shield, AlertCircle } from 'lucide-react';

interface CreateUserForm {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  department: string;
}

const ROLE_OPTIONS: { value: UserRole; label: string; description: string }[] = [
  { value: 'forensic_analyst', label: 'Analyst', description: 'Can view and analyze investigations' },
  { value: 'forensic_analyst', label: 'Forensic Analyst', description: 'Can perform forensic analysis' },
  { value: 'admin', label: 'Admin', description: 'Full platform access' },
  { value: 'super_admin', label: 'Super Admin', description: 'System-wide administration' },
];

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  admin: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  forensic_analyst: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  analyst: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

export const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateUserForm>({
    name: '',
    email: '',
    password: '',
    role: 'forensic_analyst',
    department: '',
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.getUsers({ page: currentPage, limit: 10, search: searchQuery });
      if (response.success && response.data) {
        setUsers(response.data.users);
        setTotalUsers(response.data.total);
        setTotalPages(Math.ceil(response.data.total / 10));
      }
    } catch (err) {
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchQuery]);

  const handleCreateUser = async () => {
    try {
      const response = await api.createUser(formData);
      if (response.success) {
        setShowCreateModal(false);
        setFormData({ name: '', email: '', password: '', role: 'forensic_analyst', department: '' });
        fetchUsers();
      }
    } catch (err) {
      setError('Failed to create user');
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    try {
      const response = await api.updateUser(selectedUser.id, formData);
      if (response.success) {
        setShowEditModal(false);
        setSelectedUser(null);
        setFormData({ name: '', email: '', password: '', role: 'forensic_analyst', department: '' });
        fetchUsers();
      }
    } catch (err) {
      setError('Failed to update user');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      const response = await api.deleteUser(selectedUser.id);
      if (response.success) {
        setShowDeleteModal(false);
        setSelectedUser(null);
        fetchUsers();
      }
    } catch (err) {
      setError('Failed to delete user');
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role as UserRole,
      department: user.department || '',
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (user: User) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  return (
    <div className="min-h-full">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Users className="w-8 h-8" />
              User Management
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Manage platform users and their access permissions
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-slate-900 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-lg shadow-md border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-600 rounded-lg text-slate-400 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                      Loading users...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-100/30">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-slate-900">{user.name}</div>
                          <div className="text-xs text-slate-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border ${ROLE_COLORS[user.role] || 'bg-slate-500/20 text-slate-500'}`}>
                          <Shield className="w-3 h-3" />
                          {user.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{user.department || '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEditModal(user)} className="p-2 hover:bg-slate-600 rounded transition-colors text-slate-500 hover:text-slate-900">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {user.id !== currentUser?.id && (
                            <button onClick={() => openDeleteModal(user)} className="p-2 hover:bg-red-500/20 rounded transition-colors text-slate-500 hover:text-red-400">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, totalUsers)} of {totalUsers} users
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 hover:bg-slate-100 rounded disabled:opacity-50 disabled:cursor-not-allowed text-slate-500"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-slate-500 px-2">Page {currentPage} of {totalPages}</span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 hover:bg-slate-100 rounded disabled:opacity-50 disabled:cursor-not-allowed text-slate-500"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-50 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Create New User</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-500 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-600 rounded-lg text-slate-900 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-600 rounded-lg text-slate-900 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-600 rounded-lg text-slate-900 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 bg-white border border-slate-600 rounded-lg text-slate-900 focus:border-cyan-500 focus:outline-none"
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label} - {opt.description}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Department</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-600 rounded-lg text-slate-900 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-slate-500 hover:text-slate-900">Cancel</button>
              <button onClick={handleCreateUser} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-slate-900 rounded-lg">Create User</button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-50 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Edit User</h2>
              <button onClick={() => setShowEditModal(false)} className="text-slate-500 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-600 rounded-lg text-slate-900 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-600 rounded-lg text-slate-900 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">New Password (leave blank to keep current)</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter new password to change"
                  className="w-full px-3 py-2 bg-white border border-slate-600 rounded-lg text-slate-900 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 bg-white border border-slate-600 rounded-lg text-slate-900 focus:border-cyan-500 focus:outline-none"
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label} - {opt.description}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Department</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-600 rounded-lg text-slate-900 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
              <button onClick={() => setShowEditModal(false)} className="px-4 py-2 text-slate-500 hover:text-slate-900">Cancel</button>
              <button onClick={handleUpdateUser} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-slate-900 rounded-lg">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-50 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Delete User</h2>
              <button onClick={() => setShowDeleteModal(false)} className="text-slate-500 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-slate-500">
                Are you sure you want to delete user <strong className="text-slate-900">{selectedUser?.name}</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 text-slate-500 hover:text-slate-900">Cancel</button>
              <button onClick={handleDeleteUser} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-slate-900 rounded-lg">Delete User</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;

