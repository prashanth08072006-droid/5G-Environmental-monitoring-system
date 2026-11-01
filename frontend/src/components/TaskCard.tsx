import React from 'react';
import { CheckCircle2, Circle, Star, Calendar, Clock, MoreVertical, Copy, Trash2, Edit3, AlertCircle } from 'lucide-react';
import { Task, Category } from '../types';

interface TaskCardProps {
  task: Task;
  category?: Category;
  onToggleComplete: (id: string) => void;
  onSelectTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDuplicateTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onToggleImportant?: (id: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  category,
  onToggleComplete,
  onSelectTask,
  onEditTask,
  onDuplicateTask,
  onDeleteTask,
  onToggleImportant
}) => {
  const [showMenu, setShowMenu] = React.useState(false);

  const priorityColors = {
    HIGH: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-900',
    MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-900',
    LOW: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900',
  };

  const priorityBadges = {
    HIGH: '🔴 High',
    MEDIUM: '🟡 Medium',
    LOW: '🟢 Low',
  };

  const isCompleted = task.status === 'COMPLETED';
  const isOverdue = task.status === 'OVERDUE';

  const completedSubtasks = task.subtasks ? task.subtasks.filter(st => st.completed).length : 0;
  const totalSubtasks = task.subtasks ? task.subtasks.length : 0;
  const subtaskProgress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  return (
    <div
      className={`group relative bg-white dark:bg-darkCard rounded-2xl p-4 border transition-all hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-900 ${
        isCompleted
          ? 'border-slate-100 dark:border-slate-800 opacity-75 bg-slate-50/50 dark:bg-slate-900/30'
          : isOverdue
          ? 'border-rose-200 dark:border-rose-900/50 bg-rose-50/20 dark:bg-rose-950/10'
          : 'border-slate-200/80 dark:border-darkBorder'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Checkbox & Details */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <button
            onClick={() => onToggleComplete(task.id)}
            className="mt-0.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex-shrink-0"
          >
            {isCompleted ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-100 dark:fill-emerald-950" />
            ) : (
              <Circle className="w-5 h-5" />
            )}
          </button>

          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onSelectTask(task)}>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className={`font-bold text-base leading-snug tracking-tight truncate ${
                isCompleted
                  ? 'line-through text-slate-400 dark:text-slate-500'
                  : 'text-slate-900 dark:text-white'
              }`}>
                {task.title}
              </h3>
            </div>

            {task.description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-2 font-normal">
                {task.description}
              </p>
            )}

            {/* Subtask Progress bar if subtasks exist */}
            {totalSubtasks > 0 && (
              <div className="mb-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-1">
                  <span>Subtasks</span>
                  <span>{completedSubtasks}/{totalSubtasks} ({subtaskProgress}%)</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${subtaskProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Metadata Tags & Due Date */}
            <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500 dark:text-slate-400 font-medium">
              {category && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                  <span>{category.icon}</span>
                  <span>{category.name}</span>
                </span>
              )}

              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold ${priorityColors[task.priority]}`}>
                {priorityBadges[task.priority]}
              </span>

              {task.due_date && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md ${
                  isOverdue ? 'text-rose-600 dark:text-rose-400 font-bold bg-rose-100/70 dark:bg-rose-950/80' : 'text-slate-500'
                }`}>
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{task.due_date} {task.due_time || ''}</span>
                  {isOverdue && <AlertCircle className="w-3.5 h-3.5 text-rose-600 animate-pulse ml-1" />}
                </span>
              )}

              {task.tags && task.tags.length > 0 && (
                <div className="flex items-center gap-1">
                  {task.tags.map(t => (
                    <span key={t} className="text-indigo-600 dark:text-indigo-400 font-medium text-[11px]">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions Dropdown & Star */}
        <div className="flex items-center gap-1">
          {onToggleImportant && (
            <button
              onClick={() => onToggleImportant(task.id)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 transition-colors"
            >
              <Star className={`w-4 h-4 ${task.is_important ? 'fill-amber-400 text-amber-400' : ''}`} />
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-darkCard rounded-xl shadow-xl border border-slate-100 dark:border-darkBorder py-1.5 z-20">
                <button
                  onClick={() => { setShowMenu(false); onEditTask(task); }}
                  className="w-full px-3 py-1.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => { setShowMenu(false); onDuplicateTask(task.id); }}
                  className="w-full px-3 py-1.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Duplicate</span>
                </button>
                <button
                  onClick={() => { setShowMenu(false); onDeleteTask(task.id); }}
                  className="w-full px-3 py-1.5 text-left text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
