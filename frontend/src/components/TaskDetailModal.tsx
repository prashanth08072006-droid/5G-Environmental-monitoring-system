import React from 'react';
import { X, Calendar, Clock, CheckSquare, Square, Tag, Trash2, Edit3, Copy, AlertTriangle } from 'lucide-react';
import { Task, Category } from '../types';

interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  category?: Category;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onToggleComplete: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onDuplicate: (taskId: string) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  isOpen,
  onClose,
  category,
  onToggleSubtask,
  onToggleComplete,
  onEdit,
  onDelete,
  onDuplicate
}) => {
  if (!isOpen || !task) return null;

  const completedSubtasks = task.subtasks ? task.subtasks.filter(st => st.completed).length : 0;
  const totalSubtasks = task.subtasks ? task.subtasks.length : 0;
  const subtaskProgress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-darkCard w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 dark:border-darkBorder overflow-hidden animate-in fade-in zoom-in-95 my-8">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-darkBorder flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-xl text-xs font-bold ${
              task.priority === 'HIGH' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400' :
              task.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' :
              'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
            }`}>
              {task.priority} PRIORITY
            </span>
            {task.is_important && <span className="text-amber-500 text-sm font-bold">★ Important</span>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Title & Status */}
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white leading-tight mb-2">
              {task.title}
            </h2>
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
              <span>Status: <strong className="text-indigo-600 dark:text-indigo-400">{task.status}</strong></span>
              <span>•</span>
              <span>Created: {new Date(task.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-darkBorder">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Description</h4>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
                {task.description}
              </p>
            </div>
          )}

          {/* Key Properties Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {category && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Category</span>
                <div className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5 mt-0.5">
                  <span>{category.icon}</span>
                  <span>{category.name}</span>
                </div>
              </div>
            )}
            {task.due_date && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Due Date</span>
                <div className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5 mt-0.5">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  <span>{task.due_date}</span>
                </div>
              </div>
            )}
            {task.due_time && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Due Time</span>
                <div className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-4 h-4 text-indigo-500" />
                  <span>{task.due_time}</span>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Checklist / Subtasks */}
          {task.subtasks && task.subtasks.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Checklist Progress ({completedSubtasks}/{totalSubtasks})
                </h4>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{subtaskProgress}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <div className="bg-indigo-600 h-2 rounded-full transition-all duration-300" style={{ width: `${subtaskProgress}%` }} />
              </div>

              <div className="space-y-2 pt-1">
                {task.subtasks.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => onToggleSubtask(task.id, st.id)}
                    className="w-full flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-left transition-colors"
                  >
                    {st.completed ? (
                      <CheckSquare className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-400 flex-shrink-0" />
                    )}
                    <span className={`text-sm font-medium ${st.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                      {st.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes Section */}
          {task.notes && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Notes & References</h4>
              <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl text-xs font-medium text-amber-900 dark:text-amber-200 whitespace-pre-wrap">
                {task.notes}
              </div>
            </div>
          )}

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {task.tags.map((t) => (
                  <span key={t} className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-semibold">
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-darkBorder flex items-center justify-between flex-wrap gap-3">
          <button
            onClick={() => onToggleComplete(task.id)}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center gap-2 ${
              task.status === 'COMPLETED'
                ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/30'
            }`}
          >
            {task.status === 'COMPLETED' ? 'Mark Incomplete' : '✓ Mark Complete'}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { onClose(); onEdit(task); }}
              className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-darkBorder hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300 font-semibold text-xs flex items-center gap-1.5"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit</span>
            </button>
            <button
              onClick={() => { onClose(); onDuplicate(task.id); }}
              className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-darkBorder hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300 font-semibold text-xs flex items-center gap-1.5"
            >
              <Copy className="w-4 h-4" />
              <span>Duplicate</span>
            </button>
            <button
              onClick={() => { onClose(); onDelete(task.id); }}
              className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-100 rounded-xl font-semibold text-xs flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
