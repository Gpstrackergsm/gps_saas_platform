const mysql = require('mysql2/promise');

async function checkCounts() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'gps_platform'
        });

        const deviceId = '359586018966098'; // Toyota

        // Count total rows
        const [rows] = await connection.execute(
            'SELECT COUNT(*) as count, MIN(timestamp) as min_time, MAX(timestamp) as max_time FROM positions WHERE device_id = ?',
            [deviceId]
        );

        console.log('Stats for Toyota:', rows[0]);
        await connection.end();
    } catch (err) {
        console.error('Error fetching counts:', err.message);
    }
}

checkCounts();
