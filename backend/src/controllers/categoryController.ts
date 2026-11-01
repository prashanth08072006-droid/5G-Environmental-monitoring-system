import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { db } from '../db.js';

export const getCategories = (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const categories = db.getCategories(req.user.userId);
  return res.json(categories);
};

export const createCategory = (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { name, icon, color } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Category name is required.' });
  }

  const newCat = {
    id: 'cat_' + Date.now(),
    user_id: req.user.userId,
    name: name.trim(),
    icon: icon || '🏷️',
    color: color || '#6366F1',
    is_default: false,
    created_at: new Date().toISOString()
  };

  db.createCategory(newCat);
  return res.status(201).json(newCat);
};
