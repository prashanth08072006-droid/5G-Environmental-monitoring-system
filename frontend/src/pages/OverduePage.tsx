import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Task, Category } from '../types';
import { TaskCard } from '../components/TaskCard';
import { TaskSkeleton } from '../components/SkeletonLoader';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface OverduePageProps {
  categories: Category[];
  searchQuery: string;
  onSelectTask: (t: Task) => void;
  onEditTask: (t: Task) => void;
  onTriggerToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const OverduePage: React.FC<OverduePageProps> = ({
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
      const res = await api.get('/tasks', { params: { date: 'OVERDUE', search: searchQuery } });
      setTasks(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTasks(); }, [searchQuery]);

  const handleToggleComplete = async (id: string) => {
    await api.patch(`/tasks/${id}/complete`);
    onTriggerToast('Task completed! Great job catching up!', 'success');
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

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3">
        <AlertTriangle className="w-6 h-6 text-rose-600 dark:text-rose-400 flex-shrink-0 animate-bounce" />
        <div>
          <h2 className="text-lg font-extrabold text-rose-900 dark:text-rose-300">Overdue Tasks Attention</h2>
          <p className="text-xs text-rose-700 dark:text-rose-400 font-medium">
            These tasks have passed their scheduled deadline. Complete or reschedule them.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3"><TaskSkeleton /><TaskSkeleton /></div>
      ) : tasks.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-darkCard rounded-3xl border border-slate-100 dark:border-darkBorder">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
          <h3 className="font-bold text-slate-900 dark:text-white text-lg">Zero Overdue Tasks!</h3>
          <p className="text-xs text-slate-400 mt-1">You are completely up to date with all your task deadlines.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map(t => (
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
      )}
    </div>
  );
};
