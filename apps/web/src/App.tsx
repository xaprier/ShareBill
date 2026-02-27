import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { useSettingsStore } from './stores/settingsStore';
import i18n from './i18n';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { MyDebts } from './pages/MyDebts';
import { MyExpenses } from './pages/MyExpenses';
import { History } from './pages/History';
import { Profile } from './pages/Profile';
import { Admin } from './pages/Admin';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return !isAuthenticated ? <>{children}</> : <Navigate to="/" />;
};

export const App: React.FC = () => {
  const { language } = useSettingsStore();
  const base = (import.meta.env.VITE_BASE as string) || '/';

  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language]);

  return (
    <BrowserRouter basename={base}>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/debts"
          element={
            <PrivateRoute>
              <MyDebts />
            </PrivateRoute>
          }
        />
        <Route
          path="/expenses"
          element={
            <PrivateRoute>
              <MyExpenses />
            </PrivateRoute>
          }
        />
        <Route
          path="/history"
          element={
            <PrivateRoute>
              <History />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <PrivateRoute>
              <Admin />
            </PrivateRoute>
          }
        />
        {/* Catch-all route for 404 - redirect to home if authenticated, login if not */}
        <Route
          path="*"
          element={
            <PrivateRoute>
              <Navigate to="/" replace />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};
