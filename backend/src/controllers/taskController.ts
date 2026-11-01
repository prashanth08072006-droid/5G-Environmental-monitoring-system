import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { db } from '../db.js';
import { Task, Subtask } from '../types.js';

export const getTasks = (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const tasks = db.getTasksForUser(req.user.userId);
  const { search, status, priority, category, tag, date, sort } = req.query;

  let filtered = [...tasks];

  // Search filter (title, description, category, tags)
  if (search && typeof search === 'string' && search.trim() !== '') {
    const q = search.toLowerCase().trim();
    filtered = filtered.filter(t => 
      t.title.toLowerCase().includes(q) ||
      (t.description && t.description.toLowerCase().includes(q)) ||
      (t.tags && t.tags.some(tag => tag.toLowerCase().includes(q)))
    );
  }

  // Status filter
  if (status && typeof status === 'string' && status !== 'ALL') {
    filtered = filtered.filter(t => t.status === status);
  }

  // Priority filter
  if (priority && typeof priority === 'string' && priority !== 'ALL') {
    filtered = filtered.filter(t => t.priority === priority);
  }

  // Category filter
  if (category && typeof category === 'string' && category !== 'ALL') {
    filtered = filtered.filter(t => t.category_id === category);
  }

  // Tag filter
  if (tag && typeof tag === 'string') {
    filtered = filtered.filter(t => t.tags && t.tags.includes(tag));
  }

  // Date filter
  if (date && typeof date === 'string') {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    if (date === 'TODAY') {
      filtered = filtered.filter(t => t.due_date === today);
    } else if (date === 'TOMORROW') {
      filtered = filtered.filter(t => t.due_date === tomorrow);
    } else if (date === 'OVERDUE') {
      filtered = filtered.filter(t => t.status === 'OVERDUE' || (t.due_date && t.due_date < today && t.status !== 'COMPLETED'));
    }
  }

  // Sorting
  if (sort && typeof sort === 'string') {
    filtered.sort((a, b) => {
      if (sort === 'NEWEST') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sort === 'OLDEST') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sort === 'DUE_DATE') {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return a.due_date.localeCompare(b.due_date);
      }
      if (sort === 'PRIORITY') {
        const pMap = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        return pMap[b.priority] - pMap[a.priority];
      }
      if (sort === 'TITLE') return a.title.localeCompare(b.title);
      return 0;
    });
  } else {
    // Default sort: newest first
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  return res.json(filtered);
};

export const getTaskById = (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const task = db.getTaskById(req.params.id, req.user.userId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  return res.json(task);
};

export const createTask = (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { title, description, priority, category_id, due_date, due_time, is_important, reminder, recurring, notes, tags, subtasks } = req.body;

  if (!title || title.trim() === '') {
    return res.status(400).json({ error: 'Task title is required.' });
  }

  const taskId = 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  
  const processedSubtasks: Subtask[] = (subtasks || []).map((st: any, i: number) => ({
    id: 'st_' + Date.now() + '_' + i,
    task_id: taskId,
    title: typeof st === 'string' ? st : st.title,
    completed: typeof st === 'object' ? !!st.completed : false,
    created_at: new Date().toISOString()
  }));

  const newTask: Task = {
    id: taskId,
    user_id: req.user.userId,
    title: title.trim(),
    description,
    status: 'TODO',
    priority: priority || 'MEDIUM',
    category_id: category_id || 'cat_personal',
    due_date,
    due_time,
    is_important: !!is_important,
    reminder,
    recurring,
    notes,
    tags: tags || [],
    subtasks: processedSubtasks,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.createTask(newTask);
  return res.status(201).json(newTask);
};

export const updateTask = (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const updated = db.updateTask(req.params.id, req.user.userId, req.body);
  if (!updated) return res.status(404).json({ error: 'Task not found or access denied.' });

  return res.json(updated);
};

export const toggleTaskComplete = (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const task = db.getTaskById(req.params.id, req.user.userId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const newStatus = task.status === 'COMPLETED' ? 'TODO' : 'COMPLETED';
  const updated = db.updateTask(req.params.id, req.user.userId, { status: newStatus });

  return res.json(updated);
};

export const toggleSubtask = (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { taskId, subtaskId } = req.params;

  const task = db.getTaskById(taskId, req.user.userId);
  if (!task || !task.subtasks) return res.status(404).json({ error: 'Task or subtask not found' });

  const subtasks = task.subtasks.map(st => {
    if (st.id === subtaskId) {
      return { ...st, completed: !st.completed };
    }
    return st;
  });

  const updated = db.updateTask(taskId, req.user.userId, { subtasks });
  return res.json(updated);
};

export const duplicateTask = (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const original = db.getTaskById(req.params.id, req.user.userId);
  if (!original) return res.status(404).json({ error: 'Task not found' });

  const taskId = 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const duplicated: Task = {
    ...original,
    id: taskId,
    title: `${original.title} (Copy)`,
    status: 'TODO',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    completed_at: undefined,
    subtasks: (original.subtasks || []).map((st, i) => ({
      ...st,
      id: 'st_' + Date.now() + '_' + i,
      task_id: taskId,
      completed: false
    }))
  };

  db.createTask(duplicated);
  return res.status(201).json(duplicated);
};

export const deleteTask = (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const success = db.deleteTask(req.params.id, req.user.userId);
  if (!success) return res.status(404).json({ error: 'Task not found or access denied.' });

  return res.json({ message: 'Task deleted successfully.' });
};
