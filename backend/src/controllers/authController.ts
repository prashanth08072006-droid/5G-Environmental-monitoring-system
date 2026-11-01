import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import { JWT_SECRET, AuthRequest } from '../middleware/authMiddleware.js';
import { User } from '../types.js';

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (password.length < 8 || !/\d/.test(password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long and contain at least one number.' });
    }

    const existingUser = db.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const newUser: User = {
      id: 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name,
      email,
      password_hash,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.createUser(newUser);

    const token = jwt.sign({ userId: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });

    const { password_hash: _, ...userWithoutPassword } = newUser;
    return res.status(201).json({
      message: 'Account registered successfully.',
      token,
      user: userWithoutPassword
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = db.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    const { password_hash: _, ...userWithoutPassword } = user;
    return res.json({
      message: 'Logged in successfully.',
      token,
      user: userWithoutPassword
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Login failed: ' + err.message });
  }
};

export const getProfile = (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const user = db.findUserById(req.user.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { password_hash, ...userWithoutPassword } = user;
  return res.json(userWithoutPassword);
};

export const updateProfile = (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const { name, avatar } = req.body;

  const updated = db.updateUser(req.user.userId, { name, avatar });
  if (!updated) return res.status(404).json({ error: 'User update failed' });

  const { password_hash, ...userWithoutPassword } = updated;
  return res.json(userWithoutPassword);
};
