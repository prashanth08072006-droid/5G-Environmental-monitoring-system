import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { User, Task, Category, Tag, Subtask, NotificationItem } from './types.js';

interface DatabaseSchema {
  users: User[];
  tasks: Task[];
  categories: Category[];
  tags: Tag[];
  subtasks: Subtask[];
  notifications: NotificationItem[];
}

const DB_FILE = path.join(process.cwd(), 'data', 'db.json');

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat_study', name: 'Study', icon: '📚', color: '#3B82F6', is_default: true, created_at: new Date().toISOString() },
  { id: 'cat_work', name: 'Work', icon: '💼', color: '#8B5CF6', is_default: true, created_at: new Date().toISOString() },
  { id: 'cat_personal', name: 'Personal', icon: '🏠', color: '#EC4899', is_default: true, created_at: new Date().toISOString() },
  { id: 'cat_shopping', name: 'Shopping', icon: '🛒', color: '#F59E0B', is_default: true, created_at: new Date().toISOString() },
  { id: 'cat_dev', name: 'Development', icon: '💻', color: '#10B981', is_default: true, created_at: new Date().toISOString() },
  { id: 'cat_health', name: 'Health', icon: '❤️', color: '#EF4444', is_default: true, created_at: new Date().toISOString() },
  { id: 'cat_finance', name: 'Finance', icon: '💰', color: '#06B6D4', is_default: true, created_at: new Date().toISOString() },
];

class Database {
  private data: DatabaseSchema = {
    users: [],
    tasks: [],
    categories: [],
    tags: [],
    subtasks: [],
    notifications: []
  };

  constructor() {
    this.init();
  }

  private init() {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } catch (err) {
        console.error('Error reading db.json, reinitializing default data:', err);
        this.seedDefaults();
      }
    } else {
      this.seedDefaults();
    }
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving db.json:', err);
    }
  }

  private seedDefaults() {
    const demoPasswordHash = bcrypt.hashSync('Password123', 10);
    const demoUser: User = {
      id: 'user_demo_1',
      name: 'Isaac Newton',
      email: 'isaac@example.com',
      password_hash: demoPasswordHash,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const sampleTasks: Task[] = [
      {
        id: 'task_1',
        user_id: 'user_demo_1',
        title: 'Build React Authentication System',
        description: 'Implement JWT user registration, login forms, and protected route wrappers.',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        category_id: 'cat_dev',
        due_date: todayStr,
        due_time: '18:00',
        is_important: true,
        notes: 'Use JWT authentication with validation & password hashing.',
        tags: ['react', 'backend', 'security'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        subtasks: [
          { id: 'st_1', task_id: 'task_1', title: 'Create login UI', completed: true, created_at: new Date().toISOString() },
          { id: 'st_2', task_id: 'task_1', title: 'Create API endpoints', completed: true, created_at: new Date().toISOString() },
          { id: 'st_3', task_id: 'task_1', title: 'Add JWT Middleware', completed: false, created_at: new Date().toISOString() },
        ]
      },
      {
        id: 'task_2',
        user_id: 'user_demo_1',
        title: 'Review 5G Cellular Network Documentation',
        description: 'Read chapter 4 on beamforming and massive MIMO spectral efficiency.',
        status: 'TODO',
        priority: 'MEDIUM',
        category_id: 'cat_study',
        due_date: todayStr,
        due_time: '20:30',
        is_important: true,
        tags: ['telecom', 'study'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        subtasks: []
      },
      {
        id: 'task_3',
        user_id: 'user_demo_1',
        title: 'Weekly grocery shopping list',
        description: 'Buy organic vegetables, fruits, almond milk, and whole wheat bread.',
        status: 'COMPLETED',
        priority: 'LOW',
        category_id: 'cat_shopping',
        due_date: yesterdayStr,
        due_time: '12:00',
        is_important: false,
        tags: ['shopping', 'home'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        subtasks: []
      },
      {
        id: 'task_4',
        user_id: 'user_demo_1',
        title: 'Submit Math Assignment 3',
        description: 'Upload solutions for differential equations problem set.',
        status: 'OVERDUE',
        priority: 'HIGH',
        category_id: 'cat_study',
        due_date: yesterdayStr,
        due_time: '17:00',
        is_important: true,
        tags: ['college', 'math'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        subtasks: []
      },
      {
        id: 'task_5',
        user_id: 'user_demo_1',
        title: 'Sprint Planning & Team Sync',
        description: 'Discuss Q3 deliverables and assign tickets to team members.',
        status: 'TODO',
        priority: 'MEDIUM',
        category_id: 'cat_work',
        due_date: tomorrowStr,
        due_time: '10:00',
        is_important: false,
        tags: ['work', 'meeting'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        subtasks: []
      }
    ];

    this.data = {
      users: [demoUser],
      tasks: sampleTasks,
      categories: DEFAULT_CATEGORIES,
      tags: [
        { id: 'tag_1', user_id: 'user_demo_1', name: 'react' },
        { id: 'tag_2', user_id: 'user_demo_1', name: 'backend' },
        { id: 'tag_3', user_id: 'user_demo_1', name: 'college' },
        { id: 'tag_4', user_id: 'user_demo_1', name: 'work' },
      ],
      subtasks: [],
      notifications: [
        {
          id: 'notif_1',
          user_id: 'user_demo_1',
          type: 'DAILY_SUMMARY',
          message: 'Good Morning! You have 3 tasks scheduled for today.',
          is_read: false,
          created_at: new Date().toISOString()
        }
      ]
    };

    this.save();
  }

  // User queries
  findUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  findUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  createUser(user: User): User {
    this.data.users.push(user);
    this.save();
    return user;
  }

  updateUser(id: string, updates: Partial<User>): User | undefined {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx !== -1) {
      this.data.users[idx] = { ...this.data.users[idx], ...updates, updated_at: new Date().toISOString() };
      this.save();
      return this.data.users[idx];
    }
    return undefined;
  }

  // Task queries
  getTasksForUser(userId: string): Task[] {
    const today = new Date().toISOString().split('T')[0];
    
    // Auto-update overdue status for uncompleted tasks with past due dates
    this.data.tasks.forEach(t => {
      if (t.user_id === userId && t.status !== 'COMPLETED' && t.due_date && t.due_date < today) {
        t.status = 'OVERDUE';
      }
    });

    return this.data.tasks.filter(t => t.user_id === userId);
  }

  getTaskById(id: string, userId: string): Task | undefined {
    return this.data.tasks.find(t => t.id === id && t.user_id === userId);
  }

  createTask(task: Task): Task {
    this.data.tasks.push(task);
    this.save();
    return task;
  }

  updateTask(id: string, userId: string, updates: Partial<Task>): Task | undefined {
    const idx = this.data.tasks.findIndex(t => t.id === id && t.user_id === userId);
    if (idx !== -1) {
      const existing = this.data.tasks[idx];
      const updated: Task = {
        ...existing,
        ...updates,
        updated_at: new Date().toISOString()
      };
      
      if (updates.status === 'COMPLETED' && existing.status !== 'COMPLETED') {
        updated.completed_at = new Date().toISOString();
      } else if (updates.status && updates.status !== 'COMPLETED') {
        updated.completed_at = undefined;
      }

      this.data.tasks[idx] = updated;
      this.save();
      return updated;
    }
    return undefined;
  }

  deleteTask(id: string, userId: string): boolean {
    const initialLen = this.data.tasks.length;
    this.data.tasks = this.data.tasks.filter(t => !(t.id === id && t.user_id === userId));
    if (this.data.tasks.length < initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // Categories
  getCategories(userId: string): Category[] {
    return this.data.categories.filter(c => c.is_default || c.user_id === userId);
  }

  createCategory(category: Category): Category {
    this.data.categories.push(category);
    this.save();
    return category;
  }

  // Notifications
  getNotifications(userId: string): NotificationItem[] {
    return this.data.notifications.filter(n => n.user_id === userId);
  }

  markNotificationsRead(userId: string): void {
    this.data.notifications.forEach(n => {
      if (n.user_id === userId) n.is_read = true;
    });
    this.save();
  }
}

export const db = new Database();
