import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  language: string;
  theme: 'light' | 'dark' | 'auto';
  setLanguage: (language: string) => void;
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: 'tr',
      theme: 'dark',
      setLanguage: (language) => set({ language }),
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },
    }),
    {
      name: 'settings-storage',
    }
  )
);

// Apply theme to document
function applyTheme(theme: 'light' | 'dark' | 'auto') {
  if (theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', prefersDark);
  } else {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }
}

// Initialize theme on load
applyTheme(useSettingsStore.getState().theme);
