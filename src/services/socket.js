import { io } from 'socket.io-client';

function getSocketUrl() {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '');
  }
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return window.location.origin;
  }
  return 'http://localhost:5000';
}

const SOCKET_URL = getSocketUrl();

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  transports: ['websocket', 'polling'], // WebSocket first, fallback to HTTP long-polling
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
});

socket.on('connect', () => {
  console.log(`⚡ Connected to WhatsApp CRM Real-Time Socket Gateway (${SOCKET_URL})`);
});

socket.on('disconnect', (reason) => {
  console.warn(`🔌 Disconnected from Real-Time Gateway: ${reason}`);
});

socket.on('connect_error', (err) => {
  console.warn(`⚠️ Socket connection error to ${SOCKET_URL}:`, err.message);
});
