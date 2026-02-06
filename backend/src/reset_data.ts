import { pool } from './db';

const resetData = async () => {
    try {
        console.log("⚠️  Clearing all GPS data...");

        // Disable foreign key checks to allow truncating tables with relationships
        await pool.query('SET FOREIGN_KEY_CHECKS = 0');

        await pool.query('TRUNCATE TABLE positions');
        console.log("✅ Cleared 'positions' table.");

        await pool.query('TRUNCATE TABLE raw_logs');
        console.log("✅ Cleared 'raw_logs' table.");

        // Optional: Reset device status
        await pool.query("UPDATE devices SET status = 'offline', last_seen = NULL");
        console.log("✅ Reset 'devices' status.");

        await pool.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log("🎉 All GPS data wiped successfully.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error clearing data:", error);
        process.exit(1);
    }
};

resetData();
