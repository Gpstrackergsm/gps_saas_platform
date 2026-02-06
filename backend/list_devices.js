const mysql = require('mysql2/promise');

async function listDevices() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'gps_platform'
        });

        const [rows] = await connection.execute('SELECT device_id, name FROM devices');
        console.log('Devices in database:', rows);
        await connection.end();
    } catch (err) {
        console.error('Error fetching devices:', err.message);
    }
}

listDevices();
