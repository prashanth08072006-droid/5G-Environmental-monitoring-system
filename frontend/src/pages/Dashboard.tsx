import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Task, Category, AnalyticsData } from '../types';
import { TaskCard } from '../components/TaskCard';
import { DashboardSkeleton } from '../components/SkeletonLoader';
import { useAuth } from '../context/AuthContext';
import { Plus, CheckCircle2, Clock, AlertTriangle, ListTodo, Sparkles } from 'lucide-react';

interface DashboardProps {
  categories: Category[];
  searchQuery: string;
  onOpenNewTaskModal: () => void;
  onSelectTask: (t: Task) => void;
  onEditTask: (t: Task) => void;
  onTriggerToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  categories,
  searchQuery,
  onOpenNewTaskModal,
  onSelectTask,
  onEditTask,
  onTriggerToast
}) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData['metrics'] | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [taskRes, analyticsRes] = await Promise.all([
        api.get('/tasks'),
        api.get('/analytics/dashboard')
      ]);
      setTasks(taskRes.data);
      setAnalytics(analyticsRes.data.metrics);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleComplete = async (id: string) => {
    try {
      await api.patch(`/tasks/${id}/complete`);
      onTriggerToast('Task completion status updated!', 'success');
      loadData();
    } catch (err) {
      onTriggerToast('Failed to update task status.', 'error');
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (window.confirm('Delete Task?\nThis action cannot be undone.')) {
      try {
        await api.delete(`/tasks/${id}`);
        onTriggerToast('Task deleted successfully.', 'info');
        loadData();
      } catch (err) {
        onTriggerToast('Failed to delete task.', 'error');
      }
    }
  };

  const handleDuplicateTask = async (id: string) => {
    try {
      await api.post(`/tasks/${id}/duplicate`);
      onTriggerToast('Task duplicated!', 'success');
      loadData();
    } catch (err) {
      onTriggerToast('Failed to duplicate task.', 'error');
    }
  };

  if (loading) return <DashboardSkeleton />;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayTasks = tasks.filter(t => t.due_date === todayStr);
  const upcomingTasks = tasks.filter(t => t.due_date && t.due_date > todayStr && t.status !== 'COMPLETED');

  const filteredToday = todayTasks.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredUpcoming = upcomingTasks.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-3xl text-white shadow-xl shadow-indigo-600/20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">Hello, {user?.name?.split(' ')[0] || 'User'} 👋</span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">Here's what you need to accomplish today.</h2>
          <p className="text-indigo-200 text-xs font-medium mt-1">
            Stay organized, meet your deadlines, and keep your productivity streak alive!
          </p>
        </div>
        <button
          onClick={onOpenNewTaskModal}
          className="self-start sm:self-auto py-3 px-5 bg-white text-indigo-700 hover:bg-indigo-50 rounded-2xl font-extrabold text-sm shadow-md flex items-center gap-2 transition-transform transform hover:-translate-y-0.5"
        >
          <Plus className="w-5 h-5" />
          <span>Add New Task</span>
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-darkCard rounded-2xl border border-slate-100 dark:border-darkBorder shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <ListTodo className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{analytics?.total || 0}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Tasks</div>
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-darkCard rounded-2xl border border-slate-100 dark:border-darkBorder shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{analytics?.pending || 0}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Tasks</div>
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-darkCard rounded-2xl border border-slate-100 dark:border-darkBorder shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{analytics?.completed || 0}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed</div>
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-darkCard rounded-2xl border border-slate-100 dark:border-darkBorder shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{analytics?.overdue || 0}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overdue Tasks</div>
          </div>
        </div>
      </div>

      {/* Today's Progress Bar */}
      <div className="p-6 bg-white dark:bg-darkCard rounded-2xl border border-slate-100 dark:border-darkBorder shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Today's Goal Progress</h3>
          <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
            {analytics?.todayProgress || 0}% Completed
          </span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
          <div
            className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${analytics?.todayProgress || 0}%` }}
          />
        </div>
      </div>

      {/* Today's Tasks Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Today's Tasks</h3>
          <span className="text-xs font-semibold text-slate-400">{filteredToday.length} scheduled</span>
        </div>

        {filteredToday.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-darkCard rounded-2xl border border-dashed border-slate-200 dark:border-darkBorder">
            <p className="text-3xl mb-2">📋</p>
            <p className="font-bold text-slate-800 dark:text-white text-base">No tasks scheduled for today</p>
            <p className="text-xs text-slate-400 mt-1">Enjoy your free time or add a new task to get ahead.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredToday.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                category={categories.find(c => c.id === task.category_id)}
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

      {/* Upcoming Tasks Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Upcoming Tasks</h3>
          <span className="text-xs font-semibold text-slate-400">{filteredUpcoming.length} upcoming</span>
        </div>

        {filteredUpcoming.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-darkCard rounded-2xl border border-dashed border-slate-200 dark:border-darkBorder">
            <p className="text-xs text-slate-400">No upcoming tasks scheduled for future dates.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUpcoming.slice(0, 5).map(task => (
              <TaskCard
                key={task.id}
                task={task}
                category={categories.find(c => c.id === task.category_id)}
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
    </div>
  );
};
