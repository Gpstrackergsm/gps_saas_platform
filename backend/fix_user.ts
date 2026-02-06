
import { pool } from './src/db';

async function fixUser() {
    try {
        const email = 'ltdukone@gmail.com';
        console.log(`Searching for user: ${email}...`);

        const [users]: any = await pool.query("SELECT * FROM users WHERE email = ?", [email]);

        if (users.length === 0) {
            console.log("User NOT FOUND. Creating user...");
            // Create a tenant first
            const [tenantRes]: any = await pool.query("INSERT INTO tenants (name) VALUES (?)", ['LtDukone Corp']);
            const tenantId = tenantRes.insertId;

            // Create user (password: 'password')
            // hash for 'password' is '$2b$10$YourHashHere...' but let's just use a known one or similar
            // I'll use the hash from 'admin@example.com' or just a dummy one if auth doesn't check strictly in dev? 
            // Auth checks bcrypt. I will use a known hash for 'password': $2a$10$nu1.6.M8.3.2.1.
            // Actually, I'll copy the hash from admin@example.com for convenience if I can see it, otherwise generete one?
            // Let's assume the user IS logged in, so they must exist? 
            // If they don't exist, how did they login? maybe they are using 'test@example.com' but thought they used their email?
            // OR the user meant they SIGNED UP? The app has no signup.

            // Re-read: "singing with ltdukone@gmail.com" - signing in.
            // If I return "User NOT FOUND", then the user is mistaken or something is weird.
            return;
        }

        const user = users[0];
        console.log("User found:", user);

        // Check if they have devices
        const [devices]: any = await pool.query("SELECT * FROM devices WHERE tenant_id = ?", [user.tenant_id]);
        console.log(`User (Tenant ${user.tenant_id}) has ${devices.length} devices.`);

        if (devices.length === 0) {
            console.log("Assigning test device to this user...");
            // Update the existing test device to belong to this tenant
            // Device 359586018966098 is the one the simulator uses
            await pool.query("UPDATE devices SET tenant_id = ? WHERE device_id = '359586018966098'", [user.tenant_id]);
            console.log("Assigned device 359586018966098 to tenant", user.tenant_id);
        } else {
            console.log("User already has devices:", devices);
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        process.exit();
    }
}

fixUser();
