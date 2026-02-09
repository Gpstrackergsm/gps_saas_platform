import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { query } from '../db';

const router = Router();

// GET History for a device
router.get('/:deviceId/history', authenticateToken, async (req: AuthRequest, res) => {
    const { deviceId } = req.params;
    const { start, end } = req.query;

    try {
        let sql = 'SELECT * FROM positions WHERE device_id = ?';
        const params: any[] = [deviceId];

        if (start && end) {
            sql += ' AND timestamp BETWEEN ? AND ?';
            // Convert strings to Date objects so driver handles timezone serialization correctly (to Local Time)
            params.push(new Date(start as string), new Date(end as string));
        }

        // FILTER INVALID COORDINATES (Fix for "jumping lines")
        sql += ' AND (lat != 0 AND lng != 0)';

        sql += ' ORDER BY timestamp ASC LIMIT 50000'; // Increased limit to cover full day (approx 24 hours of 3s intervals = 28800)

        const result = await query(sql, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// DELETE History for a device
router.delete('/:deviceId/history', authenticateToken, async (req: AuthRequest, res) => {
    const { deviceId } = req.params;

    try {
        await query('DELETE FROM positions WHERE device_id = ?', [deviceId]);

        // Also reset device status to offline/update timestamp?
        // Let's just clear positions as requested.

        res.json({ message: 'History deleted successfully' });
    } catch (err) {
        console.error("Error deleting history:", err);
        res.status(500).json({ error: 'Failed to delete history' });
    }
});

export default router;
