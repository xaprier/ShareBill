export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
  },
  USERS: {
    BASE: '/users',
    BY_ID: (id: string) => `/users/${id}`,
    SETTINGS: (id: string) => `/users/${id}/settings`,
  },
  TRANSACTIONS: {
    BASE: '/transactions',
    BY_ID: (id: string) => `/transactions/${id}`,
    MARK_PAID: (id: string) => `/transactions/${id}/mark-paid`,
    MY_DEBTS: '/transactions/my-debts',
    MY_HISTORY: '/transactions/my-history',
  },
  STATISTICS: {
    USER: (id: string) => `/statistics/user/${id}`,
  },
};

export const SUPPORTED_LANGUAGES = ['en', 'tr', 'es', 'de', 'fr'] as const;
export const SUPPORTED_THEMES = ['light', 'dark', 'auto'] as const;

export const DEFAULT_SETTINGS = {
  language: 'tr',
  theme: 'dark',
};

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
};
