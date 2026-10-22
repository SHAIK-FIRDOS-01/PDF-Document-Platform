import React, { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import TopNav from './TopNav';
import SidebarNav from './SidebarNav';
import { Loader2 } from 'lucide-react';

export const ProtectedLayout = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('pdf_platform_sidebar_open');
    return saved !== null ? saved === 'true' : true;
  });

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const next = !prev;
      localStorage.setItem('pdf_platform_sidebar_open', String(next));
      return next;
    });
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
    localStorage.setItem('pdf_platform_sidebar_open', 'false');
  };

  const openSidebar = () => {
    setIsSidebarOpen(true);
    localStorage.setItem('pdf_platform_sidebar_open', 'true');
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-slate-50 flex flex-col items-center justify-center space-y-3 select-none">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <span className="text-sm font-medium text-slate-600">
          Loading application...
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <TopNav
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={toggleSidebar}
      />
      <div className="flex flex-1 overflow-hidden relative">
        <SidebarNav
          isOpen={isSidebarOpen}
          onToggle={toggleSidebar}
          onClose={closeSidebar}
          onOpen={openSidebar}
        />
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 transition-all duration-200">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default ProtectedLayout;
