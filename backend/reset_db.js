const mysql = require('mysql2/promise');

async function reset() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'gps_platform'
        });

        console.log('Dropping tables...');
        await connection.execute('DROP TABLE IF EXISTS positions');
        await connection.execute('DROP TABLE IF EXISTS users'); // Users depend on tenants
        await connection.execute('DROP TABLE IF EXISTS tenants');
        await connection.execute('DROP TABLE IF EXISTS raw_logs');
        await connection.execute('DROP TABLE IF EXISTS devices'); // Positions depend on devices

        console.log('✅ Tables dropped. Restart backend to recreate.');
        await connection.end();
        process.exit(0);
    } catch (err) {
        console.error('Failed to reset:', err.message);
        process.exit(1);
    }
}

reset();
