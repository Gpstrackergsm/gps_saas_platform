
import { pool } from './src/db';

async function debug() {
    try {
        console.log("Checking 'devices' table columns...");
        const [columns]: any = await pool.query("SHOW COLUMNS FROM devices");
        console.log(columns.map((c: any) => c.Field));

        console.log("\nChecking 'users'...");
        const [users]: any = await pool.query("SELECT * FROM users");
        console.log(users);

        console.log("\nChecking 'tenants'...");
        const [tenants]: any = await pool.query("SELECT * FROM tenants");
        console.log(tenants);

        console.log("\nChecking 'devices' data...");
        const [devices]: any = await pool.query("SELECT * FROM devices");
        console.log(devices);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        process.exit();
    }
}

debug();
