import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { query } from '../db';
import { parseTK103 } from '../parser/tk103';

const router = Router();

// GET all devices for the tenant
// GET all devices for the tenant with latest position
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const tenantId = req.user.tenantId;
        // Get devices and their latest position (efficiently handling the join)
        // We use a correlated subquery in the join condition or just a simple join if we assume the latest position is what we want.
        // A robust way for MySQL:
        const result = await query(`
            SELECT 
                d.*,
                p.lat,
                p.lng,
                p.speed,
                p.course,
                p.timestamp as last_update,
                d.current_state,
                d.state_start_time
            FROM devices d
            LEFT JOIN positions p ON p.id = (
                SELECT id FROM positions 
                WHERE device_id = d.device_id 
                ORDER BY timestamp DESC 
                LIMIT 1
            )
            WHERE d.tenant_id = ? 
            ORDER BY d.last_seen DESC
        `, [tenantId]);

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch devices' });
    }
});

// ADD a new device
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
    const { deviceId, name } = req.body;
    const tenantId = req.user.tenantId;

    try {
        await query(
            'INSERT INTO devices (device_id, name, status, tenant_id) VALUES (?, ?, ?, ?)',
            [deviceId, name, 'offline', tenantId]
        );
        res.status(201).json({ message: 'Device added' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add device' });
    }
});

import { processLocationUpdate } from '../services/trackingService';

// SIMULATE Position Update (HTTP)
router.post('/simulate', async (req, res) => {
    console.log('[SIMULATE] Payload Received:', JSON.stringify(req.body));
    const { deviceId, lat, lng, speed, course, alarm, accStatus, tripDistance, internetStatus, gpsStatus } = req.body;

    // Allow simulation without auth for now

    try {
        const io = req.app.get('io');
        await processLocationUpdate({
            deviceId,
            lat,
            lng,
            speed,
            course,
            alarm,
            accStatus,
            timestamp: new Date(),
            tripDistance,
            internetStatus,
            gpsStatus
        }, io);

        res.json({ status: 'ok', message: 'Simulation data processed' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
