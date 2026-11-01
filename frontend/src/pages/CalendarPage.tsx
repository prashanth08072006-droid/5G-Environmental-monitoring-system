import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Task, Category } from '../types';
import { TaskCard } from '../components/TaskCard';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface CalendarPageProps {
  categories: Category[];
  onSelectTask: (t: Task) => void;
  onEditTask: (t: Task) => void;
  onTriggerToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const CalendarPage: React.FC<CalendarPageProps> = ({
  categories,
  onSelectTask,
  onEditTask,
  onTriggerToast
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const loadTasks = async () => {
    try {
      const res = await api.get('/tasks');
      setTasks(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { loadTasks(); }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const tasksByDate = (dateStr: string) => {
    return tasks.filter(t => t.due_date === dateStr);
  };

  const selectedTasks = tasksByDate(selectedDate);

  const daysGrid = [];
  // Offset empty days
  for (let i = 0; i < (firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1); i++) {
    daysGrid.push(null);
  }
  // Days of month
  for (let d = 1; d <= daysInMonth; d++) {
    const formattedD = d < 10 ? `0${d}` : `${d}`;
    const formattedM = (month + 1) < 10 ? `0${month + 1}` : `${month + 1}`;
    const dateStr = `${year}-${formattedM}-${formattedD}`;
    daysGrid.push({ dayNumber: d, dateStr });
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Calendar Schedule</h2>
        <p className="text-xs text-slate-500 font-medium">Visual monthly view of task deadlines and events.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid Container */}
        <div className="lg:col-span-2 bg-white dark:bg-darkCard rounded-3xl p-6 border border-slate-100 dark:border-darkBorder shadow-sm space-y-4">
          {/* Month Header Navigation */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-darkBorder">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {monthNames[month]} {year}
            </h3>
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevMonth}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 text-center text-xs font-bold text-slate-400 uppercase py-1">
            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
          </div>

          {/* Grid Cells */}
          <div className="grid grid-cols-7 gap-1">
            {daysGrid.map((item, idx) => {
              if (!item) {
                return <div key={`empty-${idx}`} className="h-14 sm:h-16 rounded-2xl bg-slate-50/40 dark:bg-slate-900/20" />;
              }

              const dayTasks = tasksByDate(item.dateStr);
              const isSelected = item.dateStr === selectedDate;
              const isToday = item.dateStr === new Date().toISOString().split('T')[0];

              return (
                <button
                  key={item.dateStr}
                  onClick={() => setSelectedDate(item.dateStr)}
                  className={`h-14 sm:h-16 rounded-2xl p-1.5 flex flex-col justify-between items-center transition-all relative border ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/30'
                      : isToday
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 font-bold'
                      : 'bg-slate-50/70 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="text-xs font-extrabold self-start pl-1">{item.dayNumber}</span>
                  {dayTasks.length > 0 && (
                    <div className="flex items-center gap-1 mb-1">
                      <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-500'}`} />
                      <span className="text-[10px] font-bold">{dayTasks.length}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Daily Task Sidebar */}
        <div className="space-y-4">
          <div className="p-4 bg-white dark:bg-darkCard rounded-2xl border border-slate-100 dark:border-darkBorder shadow-sm">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100 dark:border-darkBorder">
              <CalendarIcon className="w-4 h-4 text-indigo-500" />
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Tasks for {selectedDate}
              </h3>
            </div>

            {selectedTasks.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No tasks scheduled for this date.</p>
            ) : (
              <div className="space-y-3">
                {selectedTasks.map(t => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    category={categories.find(c => c.id === t.category_id)}
                    onToggleComplete={async (id) => { await api.patch(`/tasks/${id}/complete`); loadTasks(); }}
                    onSelectTask={onSelectTask}
                    onEditTask={onEditTask}
                    onDuplicateTask={async (id) => { await api.post(`/tasks/${id}/duplicate`); loadTasks(); }}
                    onDeleteTask={async (id) => { await api.delete(`/tasks/${id}`); loadTasks(); }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
