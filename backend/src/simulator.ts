import net from 'net';

const HOST = '127.0.0.1';
const PORT = 5001;

const client = new net.Socket();

const DEVICE_ID = '359586018966098';
const SIMULATION_INTERVAL_MS = 3000;

// Configuration
const INTERPOLATION_STEPS = 5; // Points to generate between waypoints
const MAX_TURN_ANGLE = 15; // Maximum turn angle in degrees
const SEGMENT_DISTANCE_MIN = 0.0008; // ~100m in degrees
const SEGMENT_DISTANCE_MAX = 0.0015; // ~150m in degrees
const BASE_SPEED = 60; // km/h

// Initial waypoints
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

interface Point {
    lat: number;
    lng: number;
}

// Calculate bearing between two points (in degrees)
function calculateBearing(from: Point, to: Point): number {
    const dLng = to.lng - from.lng;
    const y = Math.sin(dLng) * Math.cos(to.lat);
    const x = Math.cos(from.lat) * Math.sin(to.lat) -
        Math.sin(from.lat) * Math.cos(to.lat) * Math.cos(dLng);
    const bearing = Math.atan2(y, x);
    return (bearing * 180 / Math.PI + 360) % 360;
}

// Calculate destination point given start point, bearing and distance
function calculateDestination(point: Point, bearing: number, distance: number): Point {
    const bearingRad = bearing * Math.PI / 180;
    const lat = point.lat + distance * Math.cos(bearingRad);
    const lng = point.lng + distance * Math.sin(bearingRad);
    return { lat, lng };
}

// Interpolate between two points
function interpolate(from: Point, to: Point, steps: number): Point[] {
    const points: Point[] = [];
    for (let i = 1; i <= steps; i++) {
        const ratio = i / (steps + 1);
        points.push({
            lat: from.lat + (to.lat - from.lat) * ratio,
            lng: from.lng + (to.lng - from.lng) * ratio
        });
    }
    return points;
}

// Generate smooth path from initial waypoints
function generateSmoothPath(waypoints: Point[]): Point[] {
    const smoothPath: Point[] = [waypoints[0]];

    for (let i = 0; i < waypoints.length - 1; i++) {
        const interpolated = interpolate(waypoints[i], waypoints[i + 1], INTERPOLATION_STEPS);
        smoothPath.push(...interpolated);
        smoothPath.push(waypoints[i + 1]);
    }

    return smoothPath;
}

// Generate next waypoint based on current direction
function generateNextWaypoint(lastTwo: Point[]): Point {
    const [prev, current] = lastTwo;
    const currentBearing = calculateBearing(prev, current);

    // Add random turn angle
    const turnAngle = (Math.random() - 0.5) * 2 * MAX_TURN_ANGLE;
    const newBearing = (currentBearing + turnAngle + 360) % 360;

    // Random distance
    const distance = SEGMENT_DISTANCE_MIN + Math.random() * (SEGMENT_DISTANCE_MAX - SEGMENT_DISTANCE_MIN);

    return calculateDestination(current, newBearing, distance);
}

// Calculate speed based on turn angle
function calculateSpeed(prev: Point, current: Point, next: Point): number {
    const bearing1 = calculateBearing(prev, current);
    const bearing2 = calculateBearing(current, next);
    const turnAngle = Math.abs(bearing2 - bearing1);
    const normalizedTurn = Math.min(turnAngle, 360 - turnAngle);

    // Reduce speed on sharper turns
    const speedReduction = (normalizedTurn / 90) * 20; // Up to 20 km/h reduction
    const speed = BASE_SPEED - speedReduction + (Math.random() * 5);

    return Math.max(30, speed); // Minimum 30 km/h
}

// Initialize smooth path
let path = generateSmoothPath(INITIAL_WAYPOINTS);
let currentIndex = 0;

// Simulation State
const MOVE_DURATION_MS = 60000; // Move for 1 minute
const PARK_DURATION_MS = 30000; // Park for 30 seconds
let simState = {
    status: 'MOVING', // 'MOVING' | 'PARKED'
    lastStateChange: Date.now(),
    tripDistance: 0
};

client.connect(PORT, HOST, () => {
    console.log(`[SIMULATOR] Connected to ${HOST}:${PORT}`);
    console.log(`[SIMULATOR] Starting with ${path.length} interpolated points`);

    setInterval(() => {
        // State Machine Logic
        if (simState.status === 'MOVING') {
            // Check if we should park
            if (Date.now() - simState.lastStateChange > MOVE_DURATION_MS) {
                console.log('[SIMULATOR] Switching to PARKED state');
                simState.status = 'PARKED';
                simState.lastStateChange = Date.now();
                return; // Skip movement this tick
            }

            // Ensure we have at least 3 points ahead
            if (currentIndex >= path.length - 3) {
                const lastTwo = [path[path.length - 2], path[path.length - 1]];
                const newWaypoint = generateNextWaypoint(lastTwo);
                const interpolated = interpolate(path[path.length - 1], newWaypoint, INTERPOLATION_STEPS);
                path.push(...interpolated, newWaypoint);
                console.log(`[SIMULATOR] Extended path to ${path.length} points`);
            }

            // Get current points
            const prev = path[Math.max(0, currentIndex - 1)];
            const current = path[currentIndex];
            const next = path[currentIndex + 1];

            // Calculate Speed
            const speedKmH = calculateSpeed(prev, current, next);

            // Calculate Distance (Haversine or simple approximation)
            // 1 deg lat ~ 111km. Simple euclidean is fine for small segments.
            const dLat = (current.lat - prev.lat) * 111;
            const dLng = (current.lng - prev.lng) * 111 * Math.cos(current.lat * Math.PI / 180);
            const distKm = Math.sqrt(dLat * dLat + dLng * dLng);

            simState.tripDistance += distKm;

            const accStatus = 1; // Always 1 when moving
            // Payload: (ID, LOC, LAT, LNG, SPEED, ACC, DISTANCE)
            const payload = `(${DEVICE_ID},LOC,${current.lat.toFixed(6)},${current.lng.toFixed(6)},${speedKmH.toFixed(2)},${accStatus},${simState.tripDistance.toFixed(2)})`;

            console.log(`[SIMULATOR] MOVED: ${payload} | Trip: ${simState.tripDistance.toFixed(2)}km`);
            client.write(payload);

            currentIndex++;

        } else {
            // PARKED STATE
            if (Date.now() - simState.lastStateChange > PARK_DURATION_MS) {
                console.log('[SIMULATOR] Switching to MOVING state (New Trip)');
                simState.status = 'MOVING';
                simState.lastStateChange = Date.now();
                simState.tripDistance = 0; // Reset Trip
                return;
            }

            // Send Parked Payload (Speed 0, ACC 0, same location)
            const current = path[currentIndex]; // Stay at current
            const speedKmH = 0;
            const accStatus = 0;
            // Payload: (ID, LOC, LAT, LNG, SPEED, ACC, DISTANCE)
            const payload = `(${DEVICE_ID},LOC,${current.lat.toFixed(6)},${current.lng.toFixed(6)},${speedKmH.toFixed(2)},${accStatus},${simState.tripDistance.toFixed(2)})`;

            console.log(`[SIMULATOR] PARKED: ${payload}`);
            client.write(payload);
        }

    }, SIMULATION_INTERVAL_MS);
});

client.on('close', () => {
    console.log('[SIMULATOR] Connection closed');
});

client.on('error', (err) => {
    console.error(`[SIMULATOR] Error: ${err.message}`);
});
