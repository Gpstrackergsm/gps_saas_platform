const mysql = require('mysql2/promise');

async function testConnection() {
    const configs = [
        { user: 'root', password: '', host: 'localhost' },
        { user: 'root', password: 'password', host: 'localhost' },
        { user: 'root', password: 'root', host: 'localhost' },
        { user: process.env.USER, password: '', host: 'localhost' } // mac default
    ];

    for (const config of configs) {
        try {
            console.log(`Trying ${config.user}:***@${config.host}...`);
            const connection = await mysql.createConnection(config);
            console.log('✅ Connected successfully!');
            await connection.end();
            console.log('Valid Config:', JSON.stringify(config));
            return;
        } catch (err) {
            console.log(`❌ Failed: ${err.message}`);
        }
    }
    console.error('All connection attempts failed.');
}

testConnection();
