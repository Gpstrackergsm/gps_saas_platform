import express from 'express';
import cors from 'cors';
import authRoutes from './api/auth';
import deviceRoutes from './api/devices';
import adminRoutes from './api/admin';
import historyRoutes from './api/history';

import morgan from 'morgan';

const app = express();

app.use(morgan('dev'));
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/devices', historyRoutes); // Mount on devices path to extend it


// Health check
app.get('/', (req, res) => {
    res.send('GPS SaaS Platform API is running');
});

import { pool } from './db';
app.get('/db-check', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SHOW TABLES');
        connection.release();
        res.json({ status: 'ok', tables: rows });
    } catch (err: any) {
        res.status(500).json({ status: 'error', message: err.message, code: err.code });
    }
});

export default app;
