const mysql = require('mysql2/promise');

async function debugDB() {
    const config = {
        user: 'root',
        password: '',
        host: 'localhost',
        database: 'gps_platform'
    };

    let connection;
    try {
        connection = await mysql.createConnection(config);
    } catch (e) {
        console.error("Could not connect to DB", e.message);
        return;
    }

    const deviceId = '359586018966098';

    try {
        // 1. Check Device existence
        const [devices] = await connection.execute(
            'SELECT * FROM devices WHERE device_id = ?',
            [deviceId]
        );
        console.log(`\n--- Device Check (${deviceId}) ---`);
        if (devices.length === 0) {
            console.log("❌ Device NOT found in DB!");
        } else {
            console.log("✅ Device found:", devices[0]);
        }

        // 2. Check Raw Logs (Are we receiving ANYTHING?)
        const [logs] = await connection.execute(
            'SELECT * FROM raw_logs ORDER BY received_at DESC LIMIT 5'
        );
        console.log(`\n--- Last 5 Raw Logs ---`);
        if (logs.length === 0) {
            console.log("❌ No raw logs found!");
        } else {
            logs.forEach(l => console.log(`[${l.received_at}] ${l.payload.substring(0, 50)}...`));
        }

        // 3. Check Positions
        const [positions] = await connection.execute(
            'SELECT * FROM positions WHERE device_id = ? ORDER BY timestamp DESC LIMIT 5',
            [deviceId]
        );
        console.log(`\n--- Last 5 Positions for ${deviceId} ---`);
        if (positions.length === 0) {
            console.log("❌ No positions found!");
        } else {
            positions.forEach(p => console.log(`[${p.timestamp}] Lat:${p.lat} Lng:${p.lng}`));
        }

    } catch (err) {
        console.error("Query failed:", err.message);
    } finally {
        if (connection) await connection.end();
    }
}

debugDB();
