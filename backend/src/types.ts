export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  avatar?: string;
  created_at: string;
  updated_at: string;
}

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type RecurringOption = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  category_id?: string;
  due_date?: string; // YYYY-MM-DD
  due_time?: string; // HH:mm
  is_important: boolean;
  reminder?: string;
  recurring?: RecurringOption;
  notes?: string;
  tags?: string[];
  subtasks?: Subtask[];
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface Category {
  id: string;
  user_id?: string; // null for global defaults
  name: string;
  icon: string;
  color?: string;
  is_default?: boolean;
  created_at: string;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  task_id?: string;
  type: 'REMINDER' | 'OVERDUE' | 'DAILY_SUMMARY' | 'SYSTEM';
  message: string;
  is_read: boolean;
  created_at: string;
}
