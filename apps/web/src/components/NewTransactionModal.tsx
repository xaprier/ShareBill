import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { transactionApi, userApi } from '@/lib/api';
import { X } from 'lucide-react';
import type { User } from '@sharebill/shared';

interface NewTransactionModalProps {
  onClose: () => void;
}

export const NewTransactionModal: React.FC<NewTransactionModalProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    responsibleUsers: [] as string[],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    // Otomatik olarak kendi kullanıcısını responsible listesine ekle
    if (user && !formData.responsibleUsers.includes(user.id)) {
      setFormData(prev => ({
        ...prev,
        responsibleUsers: [user.id]
      }));
    }
  }, [user]);

  const loadUsers = async () => {
    try {
      const response = await userApi.getAll();
      if (response.data.success && response.data.data) {
        setUsers(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.responsibleUsers.length === 0) {
      setError(t('selectAtLeastOne'));
      return;
    }

    setLoading(true);
    try {
      await transactionApi.create({
        title: formData.title,
        description: formData.description || undefined,
        amount: parseFloat(formData.amount),
        responsibleUsers: formData.responsibleUsers,
      });
      onClose();
      window.location.reload(); // Refresh to show new transaction
    } catch (err: any) {
      setError(err.response?.data?.error || t('failedToCreateTransaction'));
    } finally {
      setLoading(false);
    }
  };

  const toggleUser = (userId: string) => {
    // Kendi kullanıcısını kaldıramaz
    if (userId === user?.id) {
      return;
    }

    setFormData(prev => ({
      ...prev,
      responsibleUsers: prev.responsibleUsers.includes(userId)
        ? prev.responsibleUsers.filter(id => id !== userId)
        : [...prev.responsibleUsers, userId],
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">{t('newTransaction')}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-400 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Type Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">{t('title')}</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="input"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">{t('description')}</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input"
              rows={3}
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium mb-2">{t('amount')}</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="input"
              required
            />
          </div>

          {/* Responsible Users */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('whoWillShare')}
              <span className="text-sm text-gray-500 ml-2">
                ({t('includingYou', { count: formData.responsibleUsers.length })})
              </span>
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              {users.map((u) => {
                const isCurrentUser = u.id === user?.id;
                const isChecked = formData.responsibleUsers.includes(u.id);

                return (
                  <label
                    key={u.id}
                    className={`flex items-center p-2 rounded ${isCurrentUser
                      ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer'
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleUser(u.id)}
                      disabled={isCurrentUser}
                      className="mr-3 w-4 h-4"
                    />
                    <span className={isCurrentUser ? 'font-medium' : ''}>
                      {u.username}
                      {isCurrentUser && ` (${t('youPayer')})`}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              {t('cancel')}
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary flex-1">
              {loading ? t('loading') : t('create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
