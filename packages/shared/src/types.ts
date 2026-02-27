// User Types
export interface User {
  id: string;
  username: string;
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDto {
  username: string;
  password: string;
}

export interface UpdateUserDto {
  username?: string;
  password?: string;
}

export interface LoginDto {
  username: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Transaction Types
export enum TransactionStatus {
  PENDING = 'pending',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

export interface Transaction {
  id: string;
  title: string;
  description?: string;
  amount: number;
  status: TransactionStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTransactionDto {
  title: string;
  description?: string;
  amount: number;
  responsibleUsers: string[]; // User IDs
}

export interface UpdateTransactionDto {
  title?: string;
  description?: string;
  amount?: number;
  status?: TransactionStatus;
}

// Transaction Responsibility
export interface TransactionResponsibility {
  id: string;
  transactionId: string;
  userId: string;
  share: number; // Amount this user is responsible for
  paid: boolean;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MarkAsPaidDto {
  transactionId: string;
  userId: string;
}

// User Settings
export interface UserSettings {
  userId: string;
  language: string;
  theme: string;
  updatedAt: Date;
}

export interface UpdateSettingsDto {
  language?: string;
  theme?: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Query Parameters
export interface TransactionQueryParams {
  status?: TransactionStatus;
  userId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

// Statistics
export interface UserStatistics {
  totalExpenses: number;
  pendingDebts: number;
  paidDebts: number;
}
