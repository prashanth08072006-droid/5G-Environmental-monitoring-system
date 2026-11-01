import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Task, Category, TaskStatus, TaskPriority } from '../types';
import { TaskCard } from '../components/TaskCard';
import { TaskSkeleton } from '../components/SkeletonLoader';
import { Filter, ArrowUpDown, Plus, Search, CheckSquare } from 'lucide-react';

interface TasksPageProps {
  categories: Category[];
  searchQuery: string;
  activeCategory: string | null;
  onOpenNewTaskModal: () => void;
  onSelectTask: (t: Task) => void;
  onEditTask: (t: Task) => void;
  onTriggerToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const TasksPage: React.FC<TasksPageProps> = ({
  categories,
  searchQuery,
  activeCategory,
  onOpenNewTaskModal,
  onSelectTask,
  onEditTask,
  onTriggerToast
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>(activeCategory || 'ALL');
  const [sortOption, setSortOption] = useState<string>('NEWEST');

  useEffect(() => {
    if (activeCategory) {
      setCategoryFilter(activeCategory);
    }
  }, [activeCategory]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/tasks', {
        params: {
          search: searchQuery,
          status: statusFilter,
          priority: priorityFilter,
          category: categoryFilter,
          sort: sortOption
        }
      });
      setTasks(res.data);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [searchQuery, statusFilter, priorityFilter, categoryFilter, sortOption]);

  const handleToggleComplete = async (id: string) => {
    try {
      await api.patch(`/tasks/${id}/complete`);
      onTriggerToast('Task updated!', 'success');
      loadTasks();
    } catch (err) {
      onTriggerToast('Failed to update task status.', 'error');
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (window.confirm('Delete Task?\nThis action cannot be undone.')) {
      try {
        await api.delete(`/tasks/${id}`);
        onTriggerToast('Task deleted successfully.', 'info');
        loadTasks();
      } catch (err) {
        onTriggerToast('Failed to delete task.', 'error');
      }
    }
  };

  const handleDuplicateTask = async (id: string) => {
    try {
      await api.post(`/tasks/${id}/duplicate`);
      onTriggerToast('Task duplicated!', 'success');
      loadTasks();
    } catch (err) {
      onTriggerToast('Failed to duplicate task.', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">All Tasks</h2>
          <p className="text-xs text-slate-500 font-medium">Manage, filter, search, and organize your tasks.</p>
        </div>

        <button
          onClick={onOpenNewTaskModal}
          className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Task</span>
        </button>
      </div>

      {/* Filter & Sort Bar */}
      <div className="p-4 bg-white dark:bg-darkCard rounded-2xl border border-slate-100 dark:border-darkBorder shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5" />
          <span>Filters & Controls</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-darkBorder rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500 dark:text-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">Priority</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-darkBorder rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500 dark:text-white"
            >
              <option value="ALL">All Priorities</option>
              <option value="HIGH">🔴 High</option>
              <option value="MEDIUM">🟡 Medium</option>
              <option value="LOW">🟢 Low</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-darkBorder rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500 dark:text-white"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sorting */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">Sort By</label>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-darkBorder rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500 dark:text-white"
            >
              <option value="NEWEST">Newest First</option>
              <option value="OLDEST">Oldest First</option>
              <option value="DUE_DATE">Due Date</option>
              <option value="PRIORITY">Priority Level</option>
              <option value="TITLE">Title A-Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="space-y-3">
          <TaskSkeleton />
          <TaskSkeleton />
          <TaskSkeleton />
        </div>
      ) : tasks.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-darkCard rounded-3xl border border-dashed border-slate-200 dark:border-darkBorder">
          <p className="text-4xl mb-3">🔍</p>
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">No tasks found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Try adjusting your search query or changing your filter criteria.
          </p>
          <button
            onClick={onOpenNewTaskModal}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700"
          >
            + Create Task
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
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
  );
};
