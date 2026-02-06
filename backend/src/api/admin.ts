import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { authenticateToken, AuthRequest, requireAdmin } from '../middleware/auth';
import { query } from '../db';

const router = Router();

// GET All Tenants (Companies)
router.get('/tenants', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
        const result = await query('SELECT * FROM tenants ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch tenants' });
    }
});

// CREATE New Tenant (Company)
router.post('/tenants', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    const { name, adminEmail, adminPassword } = req.body;

    try {
        await import('../db').then(m => m.transaction(async (conn) => {
            // 1. Create Tenant
            const [tenantRes] = await conn.query<any>('INSERT INTO tenants (name) VALUES (?)', [name]);
            const tenantId = tenantRes.insertId;

            // 2. Create Tenant Admin User
            const hashedPassword = await bcrypt.hash(adminPassword, 10);
            await conn.query(
                'INSERT INTO users (email, password_hash, tenant_id, role) VALUES (?, ?, ?, ?)',
                [adminEmail, hashedPassword, tenantId, 'admin']
            );
        }));

        res.status(201).json({ message: 'Tenant created successfully' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create tenant' });
    }
});

// SEARCH User by Email
router.get('/users/search', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'Email query parameter required' });

    try {
        const result = await query(
            `SELECT u.id, u.email, u.role, u.tenant_id, t.name as company_name 
             FROM users u 
             JOIN tenants t ON u.tenant_id = t.id 
             WHERE u.email LIKE ?`,
            [`%${email}%`]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Search failed' });
    }
});

// ASSIGN Device to Tenant
router.post('/devices', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    const { deviceId, name, tenantId, simPhone } = req.body;

    if (!deviceId || !tenantId) {
        return res.status(400).json({ error: 'Device ID and Tenant ID are required' });
    }

    // Validate SIM Phone
    if (simPhone) {
        if (!/^0\d{9}$/.test(simPhone)) {
            return res.status(400).json({ error: 'SIM Phone must start with 0 and be exactly 10 digits' });
        }
    }

    try {
        await query(
            'INSERT INTO devices (device_id, name, tenant_id, sim_phone) VALUES (?, ?, ?, ?)',
            [deviceId, name || deviceId, tenantId, simPhone || null]
        );

        // Insert Default Position (Marrakesh - User Requested)
        await query(
            'INSERT INTO positions (device_id, lat, lng, speed, timestamp) VALUES (?, ?, ?, ?, NOW())',
            [deviceId, 31.626829275702946, -8.003743956539244, 0]
        );

        res.status(201).json({ message: 'Device assigned successfully' });
    } catch (err: any) {
        console.error(err);
        if (err.code === 'ER_DUP_ENTRY') {
            if (err.message.includes('sim_phone')) {
                return res.status(400).json({ error: 'SIM Phone number already exists' });
            }
            return res.status(400).json({ error: 'Device ID already exists' });
        }
        res.status(500).json({ error: 'Failed to assign device' });
    }
});

// GET All Clients with Vehicle Counts
router.get('/clients', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
        const result = await query(`
            SELECT 
                u.id, 
                u.email, 
                u.phone,
                u.role, 
                u.tenant_id,
                t.name as company_name,
                COUNT(d.id) as vehicle_count
            FROM users u
            JOIN tenants t ON u.tenant_id = t.id
            LEFT JOIN devices d ON d.tenant_id = t.id
            WHERE u.role != 'admin' OR u.email != 'gsmkhalid@msn.com' 
            GROUP BY u.id, t.name, u.email, u.phone, u.role, u.tenant_id
            ORDER BY u.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch clients' });
    }
});

// GET Single Client Details & Devices
router.get('/clients/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    const userId = req.params.id;
    try {
        // 1. Fetch Client Details
        const userResult = await query(`
            SELECT 
                u.id, 
                u.email, 
                u.phone,
                u.role, 
                u.tenant_id,
                t.name as company_name
            FROM users u
            JOIN tenants t ON u.tenant_id = t.id
            WHERE u.id = ?
        `, [userId]);

        if ((userResult.rows as any[]).length === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }

        const client = (userResult.rows as any[])[0];

        // 2. Fetch Client's Devices
        const devicesResult = await query(`
            SELECT * FROM devices WHERE tenant_id = ? ORDER BY created_at DESC
        `, [client.tenant_id]);

        res.json({
            client,
            devices: devicesResult.rows
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch client details' });
    }
});

// UPDATE Device
router.put('/devices/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    const id = req.params.id;
    const { deviceId, name, simPhone } = req.body;

    // Validate SIM Phone if provided
    if (simPhone) {
        if (!/^0\d{9}$/.test(simPhone)) {
            return res.status(400).json({ error: 'SIM Phone must start with 0 and be exactly 10 digits' });
        }
    }

    try {
        await query(
            'UPDATE devices SET device_id = ?, name = ?, sim_phone = ? WHERE id = ?',
            [deviceId, name, simPhone || null, id]
        );
        res.json({ message: 'Device updated successfully' });
    } catch (err: any) {
        console.error(err);
        if (err.code === 'ER_DUP_ENTRY') {
            if (err.message.includes('sim_phone')) {
                return res.status(400).json({ error: 'SIM Phone number already exists' });
            }
            if (err.message.includes('device_id')) {
                return res.status(400).json({ error: 'Device ID (IMEI) already exists' });
            }
        }
        res.status(500).json({ error: 'Failed to update device' });
    }
});

// DELETE Device
router.delete('/devices/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    const id = req.params.id;
    try {
        await query('DELETE FROM devices WHERE id = ?', [id]);
        res.json({ message: 'Device deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete device' });
    }
});

export default router;
