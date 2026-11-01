import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Task, Category } from '../types';
import { TaskCard } from '../components/TaskCard';
import { TaskSkeleton } from '../components/SkeletonLoader';
import { Calendar as CalendarIcon } from 'lucide-react';

interface UpcomingPageProps {
  categories: Category[];
  searchQuery: string;
  onSelectTask: (t: Task) => void;
  onEditTask: (t: Task) => void;
  onTriggerToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const UpcomingPage: React.FC<UpcomingPageProps> = ({
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
      const res = await api.get('/tasks', { params: { search: searchQuery, sort: 'DUE_DATE' } });
      const today = new Date().toISOString().split('T')[0];
      const upcoming = res.data.filter((t: Task) => t.due_date && t.due_date > today && t.status !== 'COMPLETED');
      setTasks(upcoming);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTasks(); }, [searchQuery]);

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

  return (
    <div className="space-y-6 animate-in fade-in">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Upcoming Tasks</h2>
        <p className="text-xs text-slate-500 font-medium">Future deadlines and upcoming milestones.</p>
      </div>

      {loading ? (
        <div className="space-y-3"><TaskSkeleton /><TaskSkeleton /></div>
      ) : tasks.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-darkCard rounded-3xl border border-dashed border-slate-200 dark:border-darkBorder">
          <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="font-bold text-slate-800 dark:text-white">No upcoming tasks scheduled</h3>
          <p className="text-xs text-slate-400 mt-1">Add due dates to tasks to view them here.</p>
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
