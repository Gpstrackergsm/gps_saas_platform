const { io } = require('socket.io-client');

const SOCKET_URL = 'https://gpssaasplatform-production.up.railway.app';
const DEVICE_ID = '123456789012345';

console.log(`[TEST] Connecting to Production Socket: ${SOCKET_URL}`);

const socket = io(SOCKET_URL);

socket.on('connect', () => {
    console.log('[TEST] Connected to Production Socket! ✅');
});

socket.on('position', (data) => {
    if (data.deviceId === DEVICE_ID) {
        console.log(`[TEST] RECEIVED POSITION: Lat ${data.lat}, Lng ${data.lng}, Speed: ${data.speed} km/h ✅`);
    } else {
        console.log(`[TEST] Received position for other device: ${data.deviceId}`);
    }
});

socket.on('connect_error', (err) => {
    console.error(`[TEST] Connection Error: ${err.message} ❌`);
});

// Run for 30 seconds then exit
setTimeout(() => {
    console.log('[TEST] Verification complete. Closing socket.');
    socket.disconnect();
    process.exit(0);
}, 30000);
