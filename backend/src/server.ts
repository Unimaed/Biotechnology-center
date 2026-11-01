import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { pool } from './config/database.js';
import authRoutes from './modules/auth/auth.routes.js';
import adminUserRoutes from './modules/admin-users/admin-users.routes.js';

const app = express();

const PORT = Number(process.env.PORT || 10000);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';

app.use(helmet());

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));

app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());
app.use(morgan('dev'));

app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Biotechnology Centre backend is running.',
  });
});

app.get('/api/health', async (_req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS database_time');

    res.json({
      success: true,
      message: 'Backend and PostgreSQL are connected.',
      database: result.rows[0].database_time,
    });
  } catch (error) {
    console.error('Database health check failed:', error);

    res.status(503).json({
      success: false,
      message: 'Database connection failed.',
    });
  }
});

// Administrator authentication
app.use('/api/auth', authRoutes);
app.use('/api/admin-users', adminUserRoutes);

async function startServer(): Promise<void> {
  try {
    await pool.query('SELECT 1');

    app.listen(PORT, () => {
      console.log('---------------------------------------');
      console.log('Biotechnology Centre Backend');
      console.log(`Server: http://localhost:${PORT}`);
      console.log(`API: http://localhost:${PORT}/api`);
      console.log(`Health: http://localhost:${PORT}/health`);
      console.log('PostgreSQL connection successful.');
      console.log('Administrator authentication routes loaded.');
      console.log('---------------------------------------');
    });
  } catch (error) {
    console.error('Unable to start backend:', error);
    process.exit(1);
  }
}

startServer();