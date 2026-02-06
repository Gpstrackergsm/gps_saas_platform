const mysql = require('mysql2/promise');

async function debugHQ() {
    const config = { user: 'root', password: '', host: 'localhost', database: 'gps_platform' };
    let connection;
    try {
        connection = await mysql.createConnection(config);

        console.log("Searching for HQ packets in raw_logs...");
        const [logs] = await connection.execute(
            "SELECT * FROM raw_logs WHERE payload LIKE '%HQ%' ORDER BY received_at DESC LIMIT 5"
        );

        if (logs.length === 0) {
            console.log("❌ No *HQ* packets found in raw_logs.");
        } else {
            console.log("✅ Found HQ packets:");
            logs.forEach(l => console.log(`[${l.received_at}] ${l.payload}`));
        }

    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        if (connection) await connection.end();
    }
}

debugHQ();
