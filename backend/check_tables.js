const mysql = require('mysql2/promise');

async function checkTables() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'gps_platform'
        });

        const [rows] = await connection.execute('SHOW TABLES');
        console.log('Tables in database:', rows);
        await connection.end();
    } catch (err) {
        console.error('Error checking tables:', err.message);
    }
}

checkTables();
