const { pool } = require('./src/db');

const DEVICE_ID = '359586018966098';

(async () => {
    try {
        console.log(`Clearing history for device ${DEVICE_ID}...`);

        // Delete from positions
        const [result] = await pool.execute('DELETE FROM positions WHERE device_id = ?', [DEVICE_ID]);

        console.log(`Deleted ${result.affectedRows} history points.`);

        // Reset device status
        await pool.execute('UPDATE devices SET last_seen = NOW(), status = "offline" WHERE device_id = ?', [DEVICE_ID]);

        process.exit(0);
    } catch (error) {
        console.error('Error clearing history:', error);
        process.exit(1);
    }
})();
