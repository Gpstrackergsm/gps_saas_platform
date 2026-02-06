
import { pool } from './src/db';

async function checkPositions() {
    try {
        const deviceId = '359586018966098';
        console.log(`Checking positions for device: ${deviceId}...`);

        const [positions]: any = await pool.query("SELECT * FROM positions WHERE device_id = ? ORDER BY timestamp DESC LIMIT 5", [deviceId]);

        console.log(`Found ${positions.length} positions.`);
        if (positions.length > 0) {
            console.log("Latest position:", positions[0]);
        } else {
            console.log("NO POSITIONS FOUND. This is why it's not on the map.");
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        process.exit();
    }
}

checkPositions();
