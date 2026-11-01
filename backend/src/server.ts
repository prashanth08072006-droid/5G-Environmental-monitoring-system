import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { register, login, getProfile, updateProfile } from './controllers/authController.js';
import { 
  getTasks, getTaskById, createTask, updateTask, toggleTaskComplete, 
  toggleSubtask, duplicateTask, deleteTask 
} from './controllers/taskController.js';
import { getCategories, createCategory } from './controllers/categoryController.js';
import { getDashboardAnalytics } from './controllers/analyticsController.js';
import { authenticateToken } from './middleware/authMiddleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*' }));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'TaskFlow Backend API', time: new Date().toISOString() });
});

// Authentication Routes
app.post('/api/auth/register', register);
app.post('/api/auth/login', login);
app.get('/api/auth/profile', authenticateToken, getProfile);
app.put('/api/auth/profile', authenticateToken, updateProfile);

// Task Routes
app.get('/api/tasks', authenticateToken, getTasks);
app.post('/api/tasks', authenticateToken, createTask);
app.get('/api/tasks/:id', authenticateToken, getTaskById);
app.put('/api/tasks/:id', authenticateToken, updateTask);
app.delete('/api/tasks/:id', authenticateToken, deleteTask);
app.patch('/api/tasks/:id/complete', authenticateToken, toggleTaskComplete);
app.patch('/api/tasks/:taskId/subtasks/:subtaskId', authenticateToken, toggleSubtask);
app.post('/api/tasks/:id/duplicate', authenticateToken, duplicateTask);

// Category Routes
app.get('/api/categories', authenticateToken, getCategories);
app.post('/api/categories', authenticateToken, createCategory);

// Analytics Routes
app.get('/api/analytics/dashboard', authenticateToken, getDashboardAnalytics);

app.listen(PORT, () => {
  console.log(`🚀 TaskFlow Backend API server running on http://localhost:${PORT}`);
});
