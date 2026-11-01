import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Navbar } from '../components/Navbar';
import { BottomNav } from '../components/BottomNav';
import { TaskModal } from '../components/TaskModal';
import { TaskDetailModal } from '../components/TaskDetailModal';
import { ToastContainer, ToastMessage } from '../components/Toast';
import { Category, Task } from '../types';
import { api } from '../services/api';

export const DashboardLayout: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Toast State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const triggerToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const loadCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleSaveTask = async (taskData: any) => {
    try {
      if (editingTask) {
        await api.put(`/tasks/${editingTask.id}`, taskData);
        triggerToast('Task updated successfully!', 'success');
      } else {
        await api.post('/tasks', taskData);
        triggerToast('New task created!', 'success');
      }
      // Trigger a page refresh/reload event or state update
      window.dispatchEvent(new Event('task_change'));
    } catch (err) {
      triggerToast('Failed to save task.', 'error');
    }
  };

  const handleToggleSubtask = async (taskId: string, subtaskId: string) => {
    try {
      const res = await api.patch(`/tasks/${taskId}/subtasks/${subtaskId}`);
      setSelectedTask(res.data);
      window.dispatchEvent(new Event('task_change'));
    } catch (err) {
      triggerToast('Failed to update subtask.', 'error');
    }
  };

  const handleToggleComplete = async (taskId: string) => {
    try {
      const res = await api.patch(`/tasks/${taskId}/complete`);
      setSelectedTask(res.data);
      triggerToast('Status updated!', 'success');
      window.dispatchEvent(new Event('task_change'));
    } catch (err) {
      triggerToast('Failed to update status.', 'error');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('Delete this task permanently?')) {
      try {
        await api.delete(`/tasks/${taskId}`);
        triggerToast('Task deleted.', 'info');
        window.dispatchEvent(new Event('task_change'));
      } catch (err) {
        triggerToast('Failed to delete task.', 'error');
      }
    }
  };

  const handleDuplicateTask = async (taskId: string) => {
    try {
      await api.post(`/tasks/${taskId}/duplicate`);
      triggerToast('Task duplicated!', 'success');
      window.dispatchEvent(new Event('task_change'));
    } catch (err) {
      triggerToast('Failed to duplicate task.', 'error');
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-darkBg">
      {/* Desktop Sidebar */}
      <Sidebar
        categories={categories}
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        onOpenNewTaskModal={() => { setEditingTask(null); setIsTaskModalOpen(true); }}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        <Navbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet
            context={{
              categories,
              searchQuery,
              activeCategory,
              onOpenNewTaskModal: () => { setEditingTask(null); setIsTaskModalOpen(true); },
              onSelectTask: (t: Task) => { setSelectedTask(t); setIsDetailModalOpen(true); },
              onEditTask: (t: Task) => { setEditingTask(t); setIsTaskModalOpen(true); },
              onTriggerToast: triggerToast
            }}
          />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />

      {/* Create / Edit Task Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={handleSaveTask}
        categories={categories}
        initialTask={editingTask}
      />

      {/* Task Detail Modal */}
      <TaskDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        task={selectedTask}
        category={categories.find(c => c.id === selectedTask?.category_id)}
        onToggleSubtask={handleToggleSubtask}
        onToggleComplete={handleToggleComplete}
        onEdit={(t) => { setEditingTask(t); setIsTaskModalOpen(true); }}
        onDelete={handleDeleteTask}
        onDuplicate={handleDuplicateTask}
      />

      {/* Global Toast Notifications */}
      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts(prev => prev.filter(t => t.id !== id))}
      />
    </div>
  );
};
