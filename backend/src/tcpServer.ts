import net from 'net';
import { pool } from './db';
import { parseTK103 } from './parser/tk103';

const PORT = 5001;
let ioInstance: any = null;

const server = net.createServer((socket) => {
    console.log('Device connected:', socket.remoteAddress, socket.remotePort);

    socket.on('data', async (data) => {
        const rawString = data.toString();
        const timestamp = new Date();

        console.log(`[${timestamp.toISOString()}] Received: ${rawString}`);

        // 1. Raw Logging (Vacuum Mode)
        try {
            await pool.execute(
                'INSERT INTO raw_logs (payload, received_at) VALUES (?, ?)',
                [rawString, timestamp]
            );
        } catch (err) {
            console.error('Error logging raw data:', err);
        }

        // 2. Parse & Process Data
        const parsed = parseTK103(rawString);

        if (parsed) {
            console.log(`   [PARSED] ${parsed.deviceId} | Type: ${parsed.type} | Lat: ${parsed.lat?.toFixed(6)} | Lng: ${parsed.lng?.toFixed(6)}`);

            if (parsed.type === 'location_update' && parsed.lat !== undefined && parsed.lng !== undefined) {
                try {
                    // Update positions reference table
                    await pool.execute(
                        'INSERT INTO positions (device_id, lat, lng, speed, course, alarm, acc_status, internet_status, gps_status, door_status, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [
                            parsed.deviceId,
                            parsed.lat,
                            parsed.lng,
                            parsed.speed || 0,
                            parsed.course || 0,
                            parsed.alarm || null,
                            parsed.accStatus || false,
                            parsed.internetStatus || false,
                            parsed.gpsStatus || false,
                            parsed.doorStatus || false,
                            parsed.timestamp
                        ]
                    );

                    // Determine State
                    let newState = 'offline';
                    if (!parsed.accStatus) {
                        newState = 'parked';
                    } else if (parsed.speed && parsed.speed > 5) {
                        newState = 'moving';
                    } else {
                        newState = 'idling';
                    }

                    // Update device last_seen and state
                    // Logic: If state changes, update state_start_time to NOW(), otherwise keep it.
                    // We use a conditional update in SQL.
                    const updateDeviceQuery = `
                        UPDATE devices 
                        SET 
                            last_seen = ?, 
                            status = 'online',
                            internet_status = ?,
                            gps_status = ?,
                            state_start_time = CASE WHEN current_state != ? THEN ? ELSE state_start_time END,
                            current_state = ?
                            ${parsed.alarm ? ', last_alarm = ?' : ''}
                        WHERE device_id = ?
                    `;

                    const updateParams = [
                        parsed.timestamp,
                        parsed.internetStatus || false,
                        parsed.gpsStatus || false,
                        newState, // Check against new state
                        parsed.timestamp, // If changed, set to now
                        newState, // Set new state
                        ...(parsed.alarm ? [parsed.alarm] : []),
                        parsed.deviceId
                    ];


                    await pool.execute(updateDeviceQuery, updateParams);

                    console.log(`   [DB] Updated position for ${parsed.deviceId}`);

                    // 3. Fetch the actual state_start_time from DB (in case state didn't change)
                    const [deviceRows]: any = await pool.query(
                        'SELECT current_state, state_start_time FROM devices WHERE device_id = ?',
                        [parsed.deviceId]
                    );

                    const actualStateStartTime = deviceRows[0]?.state_start_time || parsed.timestamp;
                    // Always convert to ISO string - MySQL returns Date-like objects
                    const stateStartTimeISO = new Date(actualStateStartTime).toISOString();
                    console.log(`   [DEBUG] State: ${newState}, DB state_start_time: ${deviceRows[0]?.state_start_time}, ISO: ${stateStartTimeISO}`);

                    // 4. Emit Real-Time Event
                    if (ioInstance) {
                        ioInstance.emit('position', {
                            deviceId: parsed.deviceId,
                            lat: parsed.lat,
                            lng: parsed.lng,
                            speed: parsed.speed || 0,
                            course: parsed.course || 0,
                            alarm: parsed.alarm,
                            accStatus: parsed.accStatus,
                            internetStatus: parsed.internetStatus,
                            gpsStatus: parsed.gpsStatus,
                            state: newState,
                            stateStartTime: stateStartTimeISO, // Use ISO string
                            tripDistance: parsed.tripDistance || 0,
                            lastUpdate: parsed.timestamp
                        });
                        console.log(`   [SOCKET] Emitted position for ${parsed.deviceId}`);
                    }

                } catch (err) {
                    console.error('Error saving position:', err);
                }
            } else if (parsed.type.startsWith('heartbeat')) {
                // Update heartbeat/status only
                try {
                    await pool.execute(
                        'UPDATE devices SET last_seen = ?, status = ?, internet_status = ? WHERE device_id = ?',
                        [parsed.timestamp, 'online', true, parsed.deviceId]
                    );
                    console.log(`   [DB] Updated heartbeat for ${parsed.deviceId}`);
                } catch (err) {
                    console.error('Error saving heartbeat:', err);
                }
            }
        } else {
            console.log('   [WARN] Could not parse message.');
        }

        // 4. Specific Protocol Responses (Legacy/BP05)
        if (rawString.includes('BP05')) {
            const response = '(AP05)';
            socket.write(response);
            console.log('Sent Login Response:', response);
        }
    });

    socket.on('end', () => {
        console.log('Device disconnected');
    });

    socket.on('error', (err) => {
        console.error('Socket error:', err);
    });
});

export const startTcpServer = (io: any) => {
    ioInstance = io; // Set the singleton
    server.listen(PORT, () => {
        console.log(`TCP Server listening on port ${PORT}`);
    });
};
