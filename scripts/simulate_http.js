const axios = require('axios');

// Configuration
const API_URL = 'https://gpssaasplatform-production.up.railway.app/api/devices/simulate';
const DEVICE_ID = '123456789012345';
const INTERVAL_MS = 3000;

// Path Simulation (Simple circular path around Casablanca)
const CENTER_LAT = 33.5731;
const CENTER_LNG = -7.5898;
const RADIUS = 0.01; // ~1km
let angle = 0;

console.log(`[SIMULATOR] Starting HTTP Simulator for ${DEVICE_ID} -> ${API_URL}`);

setInterval(async () => {
    // Calculate next position
    angle += 0.1;
    const lat = CENTER_LAT + RADIUS * Math.cos(angle);
    const lng = CENTER_LNG + RADIUS * Math.sin(angle);

    const payload = {
        deviceId: DEVICE_ID,
        lat,
        lng,
        speed: 45 + Math.random() * 10, // ~50 km/h
        course: (angle * 180 / Math.PI + 90) % 360,
        accStatus: true,
        tripDistance: angle * 10 // Fake distance
    };

    try {
        const res = await axios.post(API_URL, payload);
        console.log(`[SIMULATOR] Sent: Lat ${lat.toFixed(6)}, Lng ${lng.toFixed(6)} | Status: ${res.status}`);
    } catch (err) {
        console.error(`[SIMULATOR] Error: ${err.message}`);
    }

}, INTERVAL_MS);
