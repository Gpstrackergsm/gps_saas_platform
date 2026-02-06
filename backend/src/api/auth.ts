import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// REGISTER
router.post('/register', async (req, res) => {
    const { email, password, companyName } = req.body;

    try {
        // 1. Check if user exists
        const userCheck = await query('SELECT * FROM users WHERE email = ?', [email]);
        if ((userCheck.rows as any[]).length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // 2. Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. Create Tenant (Company)
        // Transaction manually
        // await query('START TRANSACTION'); // BROKEN on pool

        const { userId } = await import('../db').then(m => m.transaction(async (conn) => {
            const [tenantRes] = await conn.query<any>('INSERT INTO tenants (name) VALUES (?)', [companyName]);
            const tenantId = tenantRes.insertId;

            const [userRes] = await conn.query<any>(
                'INSERT INTO users (email, password_hash, tenant_id, role) VALUES (?, ?, ?, ?)',
                [email, hashedPassword, tenantId, 'user']
            );
            return { userId: userRes.insertId };
        }));

        // await query('COMMIT');

        res.status(201).json({ message: 'User registered', user: { id: userId, email, role: 'admin' } });

    } catch (err) {
        // await query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// LOGIN
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await query('SELECT * FROM users WHERE email = ?', [email]);
        const rows = result.rows as any[];

        if (rows.length === 0) {
            return res.status(400).json({ error: 'User not found' });
        }

        const user = rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(400).json({ error: 'Invalid password' });
        }

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role, tenantId: user.tenant_id }, JWT_SECRET, { expiresIn: '1h' });

        res.json({ token, user: { id: user.id, email: user.email, role: user.role } });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// UPDATE USER PROFILE
router.put('/profile', authenticateToken, async (req: AuthRequest, res) => {
    const { password, companyName, phone } = req.body;
    const userId = req.user.id;
    const tenantId = req.user.tenantId;

    try {
        await import('../db').then(m => m.transaction(async (conn) => {
            // 1. Update Password if provided
            if (password) {
                const hashedPassword = await bcrypt.hash(password, 10);
                await conn.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, userId]);
            }

            // 2. Update Company Name if provided
            if (companyName) {
                await conn.query('UPDATE tenants SET name = ? WHERE id = ?', [companyName, tenantId]);
            }

            // 3. Update Phone if provided
            if (phone !== undefined) {
                await conn.query('UPDATE users SET phone = ? WHERE id = ?', [phone, userId]);
            }
        }));

        res.json({ message: 'Profile updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

export default router;
