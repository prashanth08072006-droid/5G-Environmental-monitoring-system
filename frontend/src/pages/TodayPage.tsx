import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Task, Category } from '../types';
import { TaskCard } from '../components/TaskCard';
import { TaskSkeleton } from '../components/SkeletonLoader';
import { Sun, Sunset, Moon, Clock } from 'lucide-react';

interface TodayPageProps {
  categories: Category[];
  searchQuery: string;
  onSelectTask: (t: Task) => void;
  onEditTask: (t: Task) => void;
  onTriggerToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const TodayPage: React.FC<TodayPageProps> = ({
  categories,
  searchQuery,
  onSelectTask,
  onEditTask,
  onTriggerToast
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTasks = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await api.get('/tasks', { params: { date: 'TODAY', search: searchQuery } });
      setTasks(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [searchQuery]);

  const handleToggleComplete = async (id: string) => {
    await api.patch(`/tasks/${id}/complete`);
    onTriggerToast('Status updated!', 'success');
    loadTasks();
  };

  const handleDeleteTask = async (id: string) => {
    if (window.confirm('Delete task?')) {
      await api.delete(`/tasks/${id}`);
      onTriggerToast('Task deleted', 'info');
      loadTasks();
    }
  };

  const handleDuplicateTask = async (id: string) => {
    await api.post(`/tasks/${id}/duplicate`);
    onTriggerToast('Task duplicated!', 'success');
    loadTasks();
  };

  // Section into Morning, Afternoon, Evening
  const morningTasks = tasks.filter(t => !t.due_time || parseInt(t.due_time.split(':')[0]) < 12);
  const afternoonTasks = tasks.filter(t => t.due_time && parseInt(t.due_time.split(':')[0]) >= 12 && parseInt(t.due_time.split(':')[0]) < 17);
  const eveningTasks = tasks.filter(t => t.due_time && parseInt(t.due_time.split(':')[0]) >= 17);

  const todayFormatted = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-8 animate-in fade-in">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Today's View</h2>
        <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">{todayFormatted}</p>
      </div>

      {loading ? (
        <div className="space-y-3"><TaskSkeleton /><TaskSkeleton /></div>
      ) : tasks.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-darkCard rounded-3xl border border-dashed border-slate-200 dark:border-darkBorder">
          <p className="text-4xl mb-2">☀️</p>
          <h3 className="font-bold text-slate-800 dark:text-white">All clear for today!</h3>
          <p className="text-xs text-slate-400 mt-1">No tasks scheduled for today.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Morning Section */}
          {morningTasks.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-extrabold text-slate-800 dark:text-slate-200 pb-2 border-b border-slate-200 dark:border-darkBorder">
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Morning Agenda</span>
                <span className="text-xs font-semibold text-slate-400">({morningTasks.length})</span>
              </div>
              <div className="space-y-3">
                {morningTasks.map(t => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    category={categories.find(c => c.id === t.category_id)}
                    onToggleComplete={handleToggleComplete}
                    onSelectTask={onSelectTask}
                    onEditTask={onEditTask}
                    onDuplicateTask={handleDuplicateTask}
                    onDeleteTask={handleDeleteTask}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Afternoon Section */}
          {afternoonTasks.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-extrabold text-slate-800 dark:text-slate-200 pb-2 border-b border-slate-200 dark:border-darkBorder">
                <Sunset className="w-4 h-4 text-orange-500" />
                <span>Afternoon Focus</span>
                <span className="text-xs font-semibold text-slate-400">({afternoonTasks.length})</span>
              </div>
              <div className="space-y-3">
                {afternoonTasks.map(t => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    category={categories.find(c => c.id === t.category_id)}
                    onToggleComplete={handleToggleComplete}
                    onSelectTask={onSelectTask}
                    onEditTask={onEditTask}
                    onDuplicateTask={handleDuplicateTask}
                    onDeleteTask={handleDeleteTask}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Evening Section */}
          {eveningTasks.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-extrabold text-slate-800 dark:text-slate-200 pb-2 border-b border-slate-200 dark:border-darkBorder">
                <Moon className="w-4 h-4 text-indigo-500" />
                <span>Evening Wrap-up</span>
                <span className="text-xs font-semibold text-slate-400">({eveningTasks.length})</span>
              </div>
              <div className="space-y-3">
                {eveningTasks.map(t => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    category={categories.find(c => c.id === t.category_id)}
                    onToggleComplete={handleToggleComplete}
                    onSelectTask={onSelectTask}
                    onEditTask={onEditTask}
                    onDuplicateTask={handleDuplicateTask}
                    onDeleteTask={handleDeleteTask}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
