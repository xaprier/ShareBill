import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { userApi } from '@/lib/api';
import { authApi } from '@/lib/api';
import { Layout } from '@/components/Layout';
import { Sun, Moon, Monitor, Globe } from 'lucide-react';

export const Profile: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const { language, theme, setLanguage, setTheme } = useSettingsStore();
  const [saving, setSaving] = useState(false);
  const [changing, setChanging] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  const languages = [
    { code: 'en', name: t('english') },
    { code: 'tr', name: t('turkish') },
  ];

  const themes = [
    { value: 'light', label: t('light'), icon: Sun },
    { value: 'dark', label: t('dark'), icon: Moon },
    { value: 'auto', label: t('auto'), icon: Monitor },
  ];

  const handleLanguageChange = async (lang: string) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
    await saveSettings({ language: lang });
  };

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'auto') => {
    setTheme(newTheme);
    await saveSettings({ theme: newTheme });
  };

  const saveSettings = async (updates: any) => {
    if (!user) return;
    setSaving(true);
    try {
      await userApi.updateSettings(user.id, updates);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) return;
    setChanging(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      // Auto logout after password change
      logout();
      navigate('/login');
    } catch (err) {
      console.error('Failed to change password:', err);
      alert('Failed to change password.');
    } finally {
      setChanging(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold">{t('profile')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t('manageAccount')}
          </p>
        </div>

        {/* User Info */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">{t('accountInfo')}</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400">{t('username')}</label>
              <p className="font-medium">{user?.username}</p>
            </div>
          </div>
        </div>

        {/* Language Settings */}
        <div className="card">
          <div className="flex items-center mb-4">
            <Globe className="w-5 h-5 mr-2 text-primary-600 dark:text-primary-400" />
            <h2 className="text-xl font-semibold">{t('language')}</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`p-3 rounded-lg border-2 transition-colors ${language === lang.code
                  ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/30'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
              >
                {lang.name}
              </button>
            ))}
          </div>
        </div>

        {/* Theme Settings */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">{t('theme')}</h2>
          <div className="grid grid-cols-3 gap-3">
            {themes.map((themeOption) => {
              const Icon = themeOption.icon;
              return (
                <button
                  key={themeOption.value}
                  onClick={() => handleThemeChange(themeOption.value as any)}
                  className={`p-4 rounded-lg border-2 transition-colors flex flex-col items-center ${theme === themeOption.value
                    ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                >
                  <Icon className="w-6 h-6 mb-2" />
                  <span className="text-sm">{themeOption.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {saving && (
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            {t('saving')}
          </p>
        )}

        {/* Change Password */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">{t('changePassword')}</h2>
          <div className="space-y-3 w-full sm:w-auto">
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400">{t('currentPassword')}</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-1 block w-full sm:max-w-md rounded-md border border-gray-200 dark:border-gray-700 p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400">{t('newPassword')}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 block w-full sm:max-w-md rounded-md border border-gray-200 dark:border-gray-700 p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex">
              <button
                onClick={handleChangePassword}
                disabled={changing}
                className="btn btn-primary w-full sm:w-auto"
              >
                {changing ? t('changing') : t('changePassword')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
