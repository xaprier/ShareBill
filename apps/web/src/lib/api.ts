import axios from 'axios';
import type {
  ApiResponse,
  AuthResponse,
  User,
  UserSettings,
  Transaction,
  CreateTransactionDto,
  PaginatedResponse,
  UserStatistics,
} from '@sharebill/shared';

const baseURL = (import.meta.env.VITE_API_URL as string) ?? '/api';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');
  const username = localStorage.getItem('username');
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (userId) {
    config.headers['x-user-id'] = userId;
  }
  if (username) {
    config.headers['x-admin-username'] = username;
  }
  
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      const base = (import.meta.env.VITE_BASE as string) || '/';
      const loginPath = base.endsWith('/') ? `${base}login` : `${base}/login`;
      window.location.href = loginPath;
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (username: string, password: string) =>
    api.post<ApiResponse<AuthResponse>>('/auth/login', { username, password }),
  
  me: () => api.get<ApiResponse<User>>('/auth/me'),
  
  createUser: (username: string, password: string) =>
    api.post<ApiResponse<User>>('/auth/create-user', { username, password }),
  
  updateUser: (id: string, data: { username?: string; password?: string }) =>
    api.put<ApiResponse<User>>(`/auth/update-user/${id}`, data),
  
  deleteUser: (id: string) =>
    api.delete<ApiResponse>(`/auth/delete-user/${id}`),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<ApiResponse>('/auth/change-password', { currentPassword, newPassword }),
};

// User API
export const userApi = {
  getAll: () => api.get<ApiResponse<User[]>>('/users'),
  
  getById: (id: string) => api.get<ApiResponse<User>>(`/users/${id}`),
  
  getSettings: (id: string) => api.get<ApiResponse<UserSettings>>(`/users/${id}/settings`),
  
  updateSettings: (id: string, settings: Partial<UserSettings>) =>
    api.patch<ApiResponse<UserSettings>>(`/users/${id}/settings`, settings),
};

// Transaction API
export const transactionApi = {
  create: (data: CreateTransactionDto) =>
    api.post<ApiResponse<Transaction>>('/transactions', data),
  
  getAll: (params?: any) =>
    api.get<ApiResponse<PaginatedResponse<Transaction>>>('/transactions', { params }),
  
  getById: (id: string) =>
    api.get<ApiResponse<any>>(`/transactions/${id}`),
  
  getMyDebts: () =>
    api.get<ApiResponse<any[]>>('/transactions/my-debts'),
  
  getMyHistory: (params?: { page?: number; pageSize?: number }) =>
    api.get<ApiResponse<PaginatedResponse<any>>>('/transactions/my-history', { params }),
  
  getMyCreated: (params?: { page?: number; pageSize?: number }) =>
    api.get<ApiResponse<PaginatedResponse<any>>>('/transactions/my-created', { params }),
  
  getDebtsSummary: () =>
    api.get<ApiResponse<any[]>>('/transactions/debts-summary'),
  
  getReceivablesSummary: () =>
    api.get<ApiResponse<any[]>>('/transactions/receivables-summary'),
  
  markAsPaid: (id: string) =>
    api.post<ApiResponse>(`/transactions/${id}/mark-paid`),
};

// Statistics API
export const statisticsApi = {
  getUserStats: (userId: string) =>
    api.get<ApiResponse<UserStatistics>>(`/statistics/user/${userId}`),
};

export default api;
