import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedLayout from './components/layout/ProtectedLayout';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DocumentsPage from './pages/documents/DocumentsPage';
import WorkspacePage from './pages/workspace/WorkspacePage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import AccountPage from './pages/auth/AccountPage';

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Document Management & Analytics Routes */}
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Navigate to="/documents" replace />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/contracts" element={<Navigate to="/documents" replace />} />
            <Route path="/workspace" element={<WorkspacePage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/account" element={<AccountPage />} />
          </Route>

          {/* Fallback Route */}
          <Route path="*" element={<Navigate to="/documents" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
