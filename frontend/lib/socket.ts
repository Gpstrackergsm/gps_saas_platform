import { io } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace('/api', '') : 'https://gpssaasplatform-production.up.railway.app';

export const socket = io(SOCKET_URL, {
    autoConnect: false,
});
