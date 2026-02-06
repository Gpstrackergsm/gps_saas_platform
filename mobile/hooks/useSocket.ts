import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_URL } from '../constants/Config';

export const useSocket = () => {
    const [socket, setSocket] = useState<Socket | null>(null);

    useEffect(() => {
        console.log('[useSocket] Initializing socket connection to:', API_URL);

        const socketIo = io(API_URL, {
            // Allow default transports (polling first, then upgrade) for better compatibility
            // transports: ['websocket'], 
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
        });

        socketIo.on('connect', () => {
            console.log('[useSocket] Socket connected successfully! ID:', socketIo.id);
        });

        socketIo.on('disconnect', (reason) => {
            console.log('[useSocket] Socket disconnected:', reason);
            if (reason === 'io server disconnect') {
                // transport closed by the server, manual reconnect needed
                socketIo.connect();
            }
        });

        socketIo.on('connect_error', (error) => {
            console.error('[useSocket] Connection error:', error.message);
        });

        socketIo.on('reconnect', (attemptNumber) => {
            console.log('[useSocket] Reconnected on attempt:', attemptNumber);
        });

        socketIo.on('reconnect_attempt', (attemptNumber) => {
            console.log('[useSocket] Reconnecting attempt:', attemptNumber);
        });

        setSocket(socketIo);

        return () => {
            console.log('[useSocket] Cleaning up socket');
            socketIo.removeAllListeners();
            socketIo.disconnect();
        };
    }, []);

    return socket;
};
