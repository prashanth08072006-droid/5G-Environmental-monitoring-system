import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, CheckSquare, Calendar, Star, Clock, AlertTriangle, 
  BarChart3, Tag, Settings, Plus, Flame 
} from 'lucide-react';
import { Category } from '../types';

interface SidebarProps {
  categories: Category[];
  activeCategory: string | null;
  onSelectCategory: (id: string | null) => void;
  onOpenNewTaskModal: () => void;
  streakDays?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  categories, 
  activeCategory, 
  onSelectCategory, 
  onOpenNewTaskModal,
  streakDays = 7
}) => {
  const mainNav = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'My Tasks', path: '/tasks', icon: CheckSquare },
    { name: 'Today', path: '/today', icon: Clock },
    { name: 'Upcoming', path: '/upcoming', icon: Calendar },
    { name: 'Overdue', path: '/overdue', icon: AlertTriangle },
    { name: 'Calendar', path: '/calendar', icon: Calendar },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-darkCard border-r border-slate-200 dark:border-darkBorder flex flex-col h-screen sticky top-0 hidden md:flex z-20">
      {/* Brand Logo */}
      <div className="p-6 border-b border-slate-100 dark:border-darkBorder flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 font-bold text-xl">
            ✓
          </div>
          <div>
            <h1 className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">TaskFlow</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Smart Task Manager</p>
          </div>
        </div>
      </div>

      {/* Streak Banner */}
      <div className="px-4 py-3 mx-4 my-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20 rounded-xl border border-amber-500/20 flex items-center gap-3">
        <div className="p-2 bg-amber-500 text-white rounded-lg shadow-sm">
          <Flame className="w-5 h-5 fill-current animate-pulse" />
        </div>
        <div>
          <div className="text-xs font-semibold text-amber-700 dark:text-amber-400">Productivity Streak</div>
          <div className="text-sm font-bold text-slate-900 dark:text-white">{streakDays} Days Strong! 🔥</div>
        </div>
      </div>

      {/* Quick Add Button */}
      <div className="px-4 mb-4">
        <button
          onClick={onOpenNewTaskModal}
          className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus className="w-5 h-5" />
          <span>New Task</span>
        </button>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto px-4 space-y-6 py-2">
        <div>
          <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-2">
            Main Menu
          </div>
          <nav className="space-y-1">
            {mainNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => onSelectCategory(null)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                      isActive && activeCategory === null
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-semibold'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Categories Section */}
        <div>
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Categories
            </span>
            <Tag className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="space-y-1">
            <button
              onClick={() => onSelectCategory(null)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                activeCategory === null
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span>📁</span>
                <span>All Categories</span>
              </div>
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Settings */}
      <div className="p-4 border-t border-slate-100 dark:border-darkBorder">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-colors ${
              isActive
                ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`
          }
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </NavLink>
      </div>
    </aside>
  );
};
