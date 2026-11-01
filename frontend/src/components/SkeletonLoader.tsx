import React from 'react';

export const TaskSkeleton: React.FC = () => {
  return (
    <div className="p-4 bg-white dark:bg-darkCard rounded-2xl border border-slate-100 dark:border-darkBorder space-y-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="w-1/2 h-5 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
        <div className="w-16 h-6 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
      </div>
      <div className="w-3/4 h-4 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
      <div className="flex items-center gap-4 pt-2">
        <div className="w-20 h-4 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
        <div className="w-24 h-4 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
      </div>
    </div>
  );
};

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="p-6 bg-white dark:bg-darkCard rounded-2xl border border-slate-100 dark:border-darkBorder animate-pulse space-y-3">
            <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
            <div className="w-20 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="w-12 h-7 bg-slate-200 dark:bg-slate-700 rounded"></div>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <TaskSkeleton />
        <TaskSkeleton />
        <TaskSkeleton />
      </div>
    </div>
  );
};
