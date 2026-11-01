import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AnalyticsData } from '../types';
import { Flame, CheckCircle2, Award, TrendingUp, BarChart, PieChart as PieIcon } from 'lucide-react';
import { BarChart as ReBarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/dashboard')
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return <div className="p-8 text-center text-slate-400">Loading productivity analytics...</div>;
  }

  const { metrics, weeklyBreakdown, categoryStats } = data;

  const milestones = [
    { label: '3 Days', count: 3, achieved: metrics.streakDays >= 3 },
    { label: '7 Days', count: 7, achieved: metrics.streakDays >= 7 },
    { label: '14 Days', count: 14, achieved: metrics.streakDays >= 14 },
    { label: '30 Days', count: 30, achieved: metrics.streakDays >= 30 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Productivity Analytics</h2>
        <p className="text-xs text-slate-500 font-medium">Track your task completion rates, weekly velocity, and streaks.</p>
      </div>

      {/* Streak Header */}
      <div className="p-6 bg-gradient-to-r from-amber-500 to-orange-600 rounded-3xl text-white shadow-xl shadow-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl text-white">
            <Flame className="w-10 h-10 fill-current animate-bounce" />
          </div>
          <div>
            <h3 className="text-3xl font-extrabold">{metrics.streakDays} Day Streak!</h3>
            <p className="text-amber-100 text-xs font-medium mt-1">
              You've completed tasks consistently. Keep the momentum going!
            </p>
          </div>
        </div>

        {/* Milestone Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {milestones.map((m) => (
            <div
              key={m.label}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                m.achieved
                  ? 'bg-white text-amber-600 border-white shadow-md'
                  : 'bg-white/10 text-amber-100 border-white/20 opacity-60'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-darkCard rounded-2xl border border-slate-100 dark:border-darkBorder shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase">Overall Completion Rate</span>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
            {metrics.completionRate}%
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-3 overflow-hidden">
            <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${metrics.completionRate}%` }} />
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-darkCard rounded-2xl border border-slate-100 dark:border-darkBorder shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase">Completed Tasks</span>
          <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            {metrics.completed} / {metrics.total}
          </div>
          <p className="text-xs text-slate-400 mt-2">Tasks successfully finished</p>
        </div>

        <div className="p-5 bg-white dark:bg-darkCard rounded-2xl border border-slate-100 dark:border-darkBorder shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase">Most Active Category</span>
          <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            {categoryStats[0]?.name || 'Development'} {categoryStats[0]?.icon || '💻'}
          </div>
          <p className="text-xs text-slate-400 mt-2">{categoryStats[0]?.count || 0} tasks logged</p>
        </div>
      </div>

      {/* Weekly Chart */}
      <div className="p-6 bg-white dark:bg-darkCard rounded-3xl border border-slate-100 dark:border-darkBorder shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart className="w-5 h-5 text-indigo-500" />
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Weekly Productivity Output</h3>
          </div>
          <span className="text-xs font-semibold text-slate-400">Tasks Completed per Day</span>
        </div>

        <div className="h-64 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <ReBarChart data={weeklyBreakdown}>
              <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff' }}
              />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {weeklyBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === 4 ? '#6366f1' : '#818cf8'} />
                ))}
              </Bar>
            </ReBarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Breakdown List */}
      <div className="p-6 bg-white dark:bg-darkCard rounded-3xl border border-slate-100 dark:border-darkBorder shadow-sm space-y-4">
        <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Category Breakdown</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categoryStats.map(cat => (
            <div key={cat.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-darkBorder space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </span>
                <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">{cat.count} Tasks</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                <div
                  className="bg-indigo-600 h-1.5 rounded-full"
                  style={{ width: `${cat.count > 0 ? Math.round((cat.completed / cat.count) * 100) : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
