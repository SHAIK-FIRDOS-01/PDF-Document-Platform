import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FileText, LogOut, Menu } from 'lucide-react';

export const TopNav = ({ isSidebarOpen = true, onToggleSidebar }) => {
  const { user, logout } = useAuth();

  const getInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  return (
    <header className="h-14 border-b border-slate-200 bg-white px-3 sm:px-5 flex items-center justify-between select-none shadow-xs z-20">
      {/* Brand & Title */}
      <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
        {/* Navigation Open / Close Toggle Button */}
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
            title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-label="Toggle navigation sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center space-x-2.5 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <span className="text-sm font-semibold tracking-tight text-slate-900 block leading-tight">
              PDF Platform
            </span>
            <span className="text-[11px] text-slate-500 hidden sm:block leading-tight">
              Document Management & Viewer
            </span>
          </div>
        </div>
      </div>

      {/* User Session & Profile Card Link */}
      <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
        {user && (
          <div className="flex items-center space-x-2">
            <Link
              to="/account"
              className="flex items-center space-x-2 text-xs bg-slate-50 hover:bg-blue-50/70 hover:border-blue-200/80 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors group shadow-2xs"
              title="Manage your profile & security settings"
            >
              <div className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                {getInitials()}
              </div>
              <span className="text-slate-700 font-medium max-w-[120px] sm:max-w-xs truncate group-hover:text-blue-700">
                {user.email}
              </span>
              <span className="hidden sm:inline-block px-1.5 py-0.2 rounded bg-slate-200/70 text-slate-600 text-[10px] font-bold">
                {user.role || 'USER'}
              </span>
            </Link>

            <button
              onClick={logout}
              title="Sign out"
              className="p-1.5 rounded-lg text-slate-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default TopNav;
