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
app.get('/promote-admin', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        await connection.query("UPDATE users SET role = 'admin' WHERE email = 'ltdukone@gmail.com'");
        connection.release();
        res.json({ status: 'ok', message: 'User promoted to admin' });
    } catch (err: any) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});



export default app;
