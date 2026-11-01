import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { User, Sun, Moon, Bell, Shield, Key, LogOut, Check } from 'lucide-react';

interface ProfileSettingsPageProps {
  onTriggerToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const ProfileSettingsPage: React.FC<ProfileSettingsPageProps> = ({ onTriggerToast }) => {
  const { user, updateUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [loading, setLoading] = useState(false);

  // Preferences toggles
  const [taskReminders, setTaskReminders] = useState(true);
  const [deadlineAlerts, setDeadlineAlerts] = useState(true);
  const [dailySummary, setDailySummary] = useState(true);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.put('/auth/profile', { name, avatar });
      updateUser(res.data);
      onTriggerToast('Profile updated successfully!', 'success');
    } catch (err) {
      onTriggerToast('Failed to update profile.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-8 animate-in fade-in">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Account & Settings</h2>
        <p className="text-xs text-slate-500 font-medium">Manage your personal details, preferences, theme, and security.</p>
      </div>

      {/* User Card */}
      <div className="p-6 bg-white dark:bg-darkCard rounded-3xl border border-slate-100 dark:border-darkBorder shadow-sm flex items-center gap-5">
        {user?.avatar ? (
          <img src={user.avatar} alt={user.name} className="w-16 h-16 rounded-2xl object-cover ring-4 ring-indigo-500/20" />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white font-extrabold text-2xl flex items-center justify-center">
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </div>
        )}
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">{user?.name}</h3>
          <p className="text-xs font-semibold text-slate-400">{user?.email}</p>
          <span className="inline-block mt-1 px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] rounded-md uppercase">
            Member since {new Date(user?.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSaveProfile} className="p-6 bg-white dark:bg-darkCard rounded-3xl border border-slate-100 dark:border-darkBorder shadow-sm space-y-4">
        <h3 className="text-base font-extrabold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-darkBorder">
          Personal Information
        </h3>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Full Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-darkBorder rounded-xl text-sm font-semibold focus:outline-none focus:border-indigo-600 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Avatar Image URL</label>
          <input
            type="url"
            value={avatar}
            onChange={(e) => setAvatar(e.target.value)}
            placeholder="https://..."
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-darkBorder rounded-xl text-sm font-semibold focus:outline-none focus:border-indigo-600 dark:text-white"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md"
        >
          {loading ? 'Saving...' : 'Save Profile Changes'}
        </button>
      </form>

      {/* Theme & Appearance */}
      <div className="p-6 bg-white dark:bg-darkCard rounded-3xl border border-slate-100 dark:border-darkBorder shadow-sm space-y-4">
        <h3 className="text-base font-extrabold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-darkBorder">
          Appearance & Theme
        </h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {theme === 'dark' ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">Dark Mode</div>
              <div className="text-xs text-slate-400">Switch between light and dark user interface color palettes.</div>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className={`w-12 h-6 rounded-full p-1 transition-colors ${theme === 'dark' ? 'bg-indigo-600' : 'bg-slate-300'}`}
          >
            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      {/* Notifications Preferences */}
      <div className="p-6 bg-white dark:bg-darkCard rounded-3xl border border-slate-100 dark:border-darkBorder shadow-sm space-y-4">
        <h3 className="text-base font-extrabold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-darkBorder">
          Notification Preferences
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Task Reminders</span>
            <input type="checkbox" checked={taskReminders} onChange={(e) => setTaskReminders(e.target.checked)} className="w-4 h-4 rounded text-indigo-600" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Deadline Alerts</span>
            <input type="checkbox" checked={deadlineAlerts} onChange={(e) => setDeadlineAlerts(e.target.checked)} className="w-4 h-4 rounded text-indigo-600" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Daily Productivity Summary</span>
            <input type="checkbox" checked={dailySummary} onChange={(e) => setDailySummary(e.target.checked)} className="w-4 h-4 rounded text-indigo-600" />
          </div>
        </div>
      </div>

      {/* Logout */}
      <div className="pt-4">
        <button
          onClick={logout}
          className="w-full py-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 font-bold text-sm rounded-2xl flex items-center justify-center gap-2 hover:bg-rose-100 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out of TaskFlow</span>
        </button>
      </div>
    </div>
  );
};
