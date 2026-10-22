import React from 'react';
import { NavLink } from 'react-router-dom';
import { FileText, SplitSquareVertical, ChevronLeft, X, BarChart3, ShieldCheck } from 'lucide-react';

const NAV_ITEMS = [
  {
    to: '/documents',
    label: 'Documents',
    badge: 'DOCS',
    icon: FileText,
  },
  {
    to: '/workspace',
    label: 'Split-Screen Viewer',
    badge: 'VIEWER',
    icon: SplitSquareVertical,
  },
  {
    to: '/analytics',
    label: 'User Analytics',
    badge: 'STATS',
    icon: BarChart3,
  },
  {
    to: '/account',
    label: 'Account & Security',
    badge: 'AUTH',
    icon: ShieldCheck,
  },
];

export const SidebarNav = ({ isOpen = true, onToggle, onClose }) => {
  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="md:hidden fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200"
          aria-hidden="true"
        />
      )}

      {/* Mobile Slide-in Drawer (< 768px) */}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 shadow-2xl flex flex-col justify-between select-none transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-semibold tracking-tight text-slate-900 block leading-tight">
                  PDF Platform
                </span>
                <span className="text-[10px] text-slate-500 block leading-tight">
                  Navigation Menu
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-1">
            <div className="px-3 py-1.5 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              Modules
            </div>

            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2.5 rounded-lg text-xs transition-colors font-medium ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200/60 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`
                  }
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon className="w-4 h-4 text-slate-500" />
                    <span>{item.label}</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                    {item.badge}
                  </span>
                </NavLink>
              );
            })}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 text-[11px] text-slate-400">
          PDF Document Platform v1.0
        </div>
      </aside>

      {/* Desktop Collapsible Left Sidebar (>= 768px) */}
      <aside
        className={`hidden md:flex border-r border-slate-200 bg-white flex-col justify-between select-none flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen ? 'w-56 lg:w-60 opacity-100' : 'w-0 opacity-0 border-r-0'
        }`}
      >
        <div className="w-56 lg:w-60 p-3 space-y-1">
          <div className="px-3 py-2 flex items-center justify-between text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            <span>Navigation</span>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors font-medium ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200/60 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`
                }
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className="w-4 h-4 text-slate-500" />
                  <span>{item.label}</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                  {item.badge}
                </span>
              </NavLink>
            );
          })}
        </div>

        <div className="w-56 lg:w-60 p-3 border-t border-slate-100 text-[11px] text-slate-400">
          <button
            type="button"
            onClick={onClose}
            className="w-full flex items-center justify-center space-x-1.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-md border border-slate-200 transition-colors shadow-2xs"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Collapse Menu</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default SidebarNav;
