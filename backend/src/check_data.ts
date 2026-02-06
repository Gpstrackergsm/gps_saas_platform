import { pool } from './db';

const checkData = async () => {
    console.log("STARTING CHECK...");
    try {
        const [rows]: any = await pool.query('SELECT COUNT(*) as count FROM positions');
        console.log(`Current position count: ${rows[0].count}`);
        process.exit(0);
    } catch (error) {
        console.error("Error checking data:", error);
        process.exit(1);
    }
};

checkData();
