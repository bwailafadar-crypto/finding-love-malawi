import { useEffect, useRef, useState } from 'react';

let socket = null;

export function useSocket() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (socket?.connected) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    import('socket.io-client').then(({ io }) => {
      if (socket?.connected) return;
      socket = io('/', { auth: { token }, transports: ['websocket', 'polling'] });
      socket.on('connect', () => setConnected(true));
      socket.on('disconnect', () => setConnected(false));
    });

    return () => {};
  }, []);

  return socket;
}

export function getSocket() { return socket; }
