const axios = require('axios');

// Configuration
const API_URL = 'https://gpssaasplatform-production.up.railway.app/api/devices/simulate';
const DEVICE_ID = '123456789012345';
const SIMULATION_INTERVAL_MS = 3000;

// Config settings from professional simulator
const INTERPOLATION_STEPS = 5;
const MAX_TURN_ANGLE = 15;
const SEGMENT_DISTANCE_MIN = 0.0008;
const SEGMENT_DISTANCE_MAX = 0.0015;
const BASE_SPEED = 60;

// Initial waypoints (same as professional simulator)
const INITIAL_WAYPOINTS = [
    { lat: 33.5731, lng: -7.5898 },
    { lat: 33.5725, lng: -7.5870 },
    { lat: 33.5718, lng: -7.5840 },
    { lat: 33.5709, lng: -7.5812 },
    { lat: 33.5700, lng: -7.5785 },
    { lat: 33.5692, lng: -7.5757 },
    { lat: 33.5684, lng: -7.5729 },
    { lat: 33.5676, lng: -7.5702 },
    { lat: 33.5668, lng: -7.5674 },
    { lat: 33.5660, lng: -7.5646 }
];

// Helper functions (same logic as professional simulator)
function calculateBearing(from, to) {
    const dLng = to.lng - from.lng;
    const y = Math.sin(dLng) * Math.cos(to.lat);
    const x = Math.cos(from.lat) * Math.sin(to.lat) - Math.sin(from.lat) * Math.cos(to.lat) * Math.cos(dLng);
    const bearing = Math.atan2(y, x);
    return (bearing * 180 / Math.PI + 360) % 360;
}

function calculateDestination(point, bearing, distance) {
    const bearingRad = bearing * Math.PI / 180;
    const lat = point.lat + distance * Math.cos(bearingRad);
    const lng = point.lng + distance * Math.sin(bearingRad);
    return { lat, lng };
}

function interpolate(from, to, steps) {
    const points = [];
    for (let i = 1; i <= steps; i++) {
        const ratio = i / (steps + 1);
        points.push({
            lat: from.lat + (to.lat - from.lat) * ratio,
            lng: from.lng + (to.lng - from.lng) * ratio
        });
    }
    return points;
}

function generateSmoothPath(waypoints) {
    const smoothPath = [waypoints[0]];
    for (let i = 0; i < waypoints.length - 1; i++) {
        const interpolated = interpolate(waypoints[i], waypoints[i + 1], INTERPOLATION_STEPS);
        smoothPath.push(...interpolated);
        smoothPath.push(waypoints[i + 1]);
    }
    return smoothPath;
}

function generateNextWaypoint(lastTwo) {
    const [prev, current] = lastTwo;
    const currentBearing = calculateBearing(prev, current);
    const turnAngle = (Math.random() - 0.5) * 2 * MAX_TURN_ANGLE;
    const newBearing = (currentBearing + turnAngle + 360) % 360;
    const distance = SEGMENT_DISTANCE_MIN + Math.random() * (SEGMENT_DISTANCE_MAX - SEGMENT_DISTANCE_MIN);
    return calculateDestination(current, newBearing, distance);
}

function calculateSpeed(prev, current, next) {
    if (!prev || !next) return BASE_SPEED;
    const bearing1 = calculateBearing(prev, current);
    const bearing2 = calculateBearing(current, next);
    const turnAngle = Math.abs(bearing2 - bearing1);
    const normalizedTurn = Math.min(turnAngle, 360 - turnAngle);
    const speedReduction = (normalizedTurn / 90) * 20;
    const speed = BASE_SPEED - speedReduction + (Math.random() * 5);
    return Math.max(30, speed);
}

// Initialization
let path = generateSmoothPath(INITIAL_WAYPOINTS);
let currentIndex = 0;

const MOVE_DURATION_MS = 60000;
const PARK_DURATION_MS = 30000;
let simState = {
    status: 'MOVING', // 'MOVING' | 'PARKED'
    lastStateChange: Date.now(),
    tripDistance: 0
};

console.log(`[SIMULATOR] Starting Professional HTTP Simulator for ${DEVICE_ID} -> ${API_URL}`);

setInterval(async () => {
    try {
        if (simState.status === 'MOVING') {
            if (Date.now() - simState.lastStateChange > MOVE_DURATION_MS) {
                console.log('[SIMULATOR] Switching to PARKED state');
                simState.status = 'PARKED';
                simState.lastStateChange = Date.now();
                return;
            }

            if (currentIndex >= path.length - 3) {
                const lastTwo = [path[path.length - 2], path[path.length - 1]];
                const newWaypoint = generateNextWaypoint(lastTwo);
                const interpolated = interpolate(path[path.length - 1], newWaypoint, INTERPOLATION_STEPS);
                path.push(...interpolated, newWaypoint);
            }

            const prev = path[Math.max(0, currentIndex - 1)];
            const current = path[currentIndex];
            const next = path[currentIndex + 1] || current;

            const speedKmH = calculateSpeed(prev, current, next);

            // Calc distance
            const dLat = (current.lat - prev.lat) * 111;
            const dLng = (current.lng - prev.lng) * 111 * Math.cos(current.lat * Math.PI / 180);
            const distKm = Math.sqrt(dLat * dLat + dLng * dLng);
            simState.tripDistance += distKm;

            const payload = {
                deviceId: DEVICE_ID,
                lat: current.lat,
                lng: current.lng,
                speed: speedKmH,
                course: calculateBearing(prev, current),
                accStatus: true,
                internetStatus: true, // Simulator always has "internet"
                gpsStatus: Math.random() > 0.05, // 5% chance of "GPS lost" for testing
                tripDistance: parseFloat(simState.tripDistance.toFixed(3))
            };

            const res = await axios.post(API_URL, payload);
            console.log(`[SIMULATOR] MOVED: Lat ${current.lat.toFixed(6)}, Lng ${current.lng.toFixed(6)}, Speed: ${speedKmH.toFixed(1)}km/h | Status: ${res.status}`);

            currentIndex++;
        } else {
            // PARKED
            if (Date.now() - simState.lastStateChange > PARK_DURATION_MS) {
                console.log('[SIMULATOR] Switching to MOVING state (New Trip)');
                simState.status = 'MOVING';
                simState.lastStateChange = Date.now();
                simState.tripDistance = 0;
                return;
            }

            const current = path[currentIndex];
            const payload = {
                deviceId: DEVICE_ID,
                lat: current.lat,
                lng: current.lng,
                speed: 0,
                course: 0,
                accStatus: false,
                tripDistance: parseFloat(simState.tripDistance.toFixed(3))
            };

            const res = await axios.post(API_URL, payload);
            console.log(`[SIMULATOR] PARKED: Lat ${current.lat.toFixed(6)} | Status: ${res.status}`);
        }
    } catch (err) {
        console.error(`[SIMULATOR] Error: ${err.message}`);
    }
}, SIMULATION_INTERVAL_MS);
