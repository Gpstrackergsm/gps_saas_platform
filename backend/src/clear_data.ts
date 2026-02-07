import { pool } from './db';

const clearData = async () => {
    try {
        const connection = await pool.getConnection();

        // Delete all positions for test device
        await connection.query("DELETE FROM positions WHERE device_id = '123456789012345'");
        console.log('✅ Cleared all old trajectory data for device 123456789012345');

        connection.release();
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
};

clearData();
