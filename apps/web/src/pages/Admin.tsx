import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { authApi, userApi } from '@/lib/api';
import { Layout } from '@/components/Layout';
import { UserPlus, Users, Trash2, Edit2 } from 'lucide-react';
import type { User } from '@sharebill/shared';

export const Admin: React.FC = () => {
  const { t } = useTranslation();
  const { user: currentUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await userApi.getAll();
      if (response.data.success && response.data.data) {
        setUsers(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.username || !formData.password) {
      setError(t('error'));
      return;
    }

    try {
      const response = await authApi.createUser(formData.username, formData.password);

      if (response.data.success) {
        setSuccess(t('userCreated'));
        setFormData({ username: '', password: '' });
        setShowCreateForm(false);
        loadUsers();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || t('failedToCreate'));
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setError('');
    setSuccess('');

    const updateData: { username?: string; password?: string } = {};

    if (formData.username && formData.username !== editingUser.username) {
      updateData.username = formData.username;
    }

    if (formData.password) {
      updateData.password = formData.password;
    }

    if (Object.keys(updateData).length === 0) {
      setError(t('noChanges'));
      return;
    }

    const isUpdatingOwnUsername = editingUser.id === currentUser?.id && updateData.username;

    try {
      const response = await authApi.updateUser(editingUser.id, updateData);

      if (response.data.success) {
        setSuccess(t('userUpdated'));
        setFormData({ username: '', password: '' });
        setEditingUser(null);
        loadUsers();

        // If updating own username, logout
        if (isUpdatingOwnUsername) {
          setTimeout(() => {
            logout();
            navigate('/login');
          }, 1000);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || t('failedToUpdate'));
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (user.isAdmin) {
      setError(t('cannotDeleteAdmin'));
      return;
    }

    if (!confirm(t('confirmDelete', { username: user.username }))) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const response = await authApi.deleteUser(user.id);

      if (response.data.success) {
        setSuccess(t('userDeleted'));
        loadUsers();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || t('failedToDelete'));
    }
  };

  const startEditUser = (user: User) => {
    setEditingUser(user);
    setFormData({ username: user.username, password: '' });
    setShowCreateForm(false);
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setFormData({ username: '', password: '' });
  };

  if (!currentUser?.isAdmin) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-red-600 mb-4">{t('accessDenied')}</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('noPermission')}
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('adminPanel')}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {t('manageUsers')}
            </p>
          </div>
          {!editingUser && (
            <button
              onClick={() => {
                setShowCreateForm(!showCreateForm);
                setFormData({ username: '', password: '' });
                setError('');
                setSuccess('');
              }}
              className="btn btn-primary flex items-center w-full md:w-auto"
            >
              <UserPlus className="w-5 h-5 mr-2" />
              {t('createUser')}
            </button>
          )}
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-400 px-4 py-3 rounded">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-100 dark:bg-green-900/30 border border-green-400 text-green-700 dark:text-green-400 px-4 py-3 rounded">
            {success}
          </div>
        )}

        {/* Create User Form */}
        {showCreateForm && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <UserPlus className="w-5 h-5 mr-2" />
              {t('newUser')}
            </h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">{t('username')}</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">{t('password')}</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="input"
                    required
                  />
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setFormData({ username: '', password: '' });
                  }}
                  className="btn btn-secondary w-full md:w-auto"
                >
                  {t('cancel')}
                </button>
                <button type="submit" className="btn btn-primary w-full md:w-auto">
                  {t('createUser')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Edit User Form */}
        {editingUser && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Edit2 className="w-5 h-5 mr-2" />
              {t('editUser')}: {editingUser.username}
            </h2>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">{t('username')}</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="input"
                  />
                  {editingUser.id === currentUser?.id && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">{t('changingOwnUsername')}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('newPassword')} <span className="text-gray-500">({t('leaveEmptyPassword')})</span>
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="input"
                    placeholder={t('password')}
                  />
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="btn btn-secondary w-full md:w-auto"
                >
                  {t('cancel')}
                </button>
                <button type="submit" className="btn btn-primary w-full md:w-auto">
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Users List */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            {t('allUsers', { count: users.length })}
          </h2>

          {loading ? (
            <div className="text-center py-8">{t('loading')}</div>
          ) : (
            <>
              {/* Desktop/table view */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="text-left py-3 px-4">{t('username')}</th>
                      <th className="text-left py-3 px-4">{t('created')}</th>
                      <th className="text-right py-3 px-4">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr
                        key={user.id}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <td className="py-3 px-4 font-medium">
                          {user.username}
                          {user.isAdmin && (
                            <span className="ml-2 text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 px-2 py-0.5 rounded">
                              {t('admin')}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => startEditUser(user)}
                              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                              title={t('edit')}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {!user.isAdmin && (
                              <button
                                onClick={() => handleDeleteUser(user)}
                                className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                                title={t('delete')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile/card view */}
              <div className="md:hidden space-y-3">
                {users.map((user) => (
                  <div key={user.id} className="p-3 border rounded-lg bg-white dark:bg-gray-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{user.username}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{new Date(user.createdAt).toLocaleDateString()}</div>
                        {user.isAdmin && (
                          <div className="mt-2 inline-block text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 px-2 py-0.5 rounded">
                            {t('admin')}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => startEditUser(user)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                          title={t('edit')}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {!user.isAdmin && (
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg"
                            title={t('delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};
