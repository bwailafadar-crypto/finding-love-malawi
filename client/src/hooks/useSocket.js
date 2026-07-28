import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

let globalSocket = null;

export function useSocket() {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      if (globalSocket) { globalSocket.disconnect(); globalSocket = null; }
      return;
    }

    if (globalSocket?.connected) {
      socketRef.current = globalSocket;
      setConnected(true);
      return;
    }

    if (!globalSocket) {
      globalSocket = io('/', { auth: { token }, transports: ['websocket', 'polling'] });
    }

    socketRef.current = globalSocket;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    globalSocket.on('connect', onConnect);
    globalSocket.on('disconnect', onDisconnect);

    if (globalSocket.connected) setConnected(true);

    return () => {
      globalSocket?.off('connect', onConnect);
      globalSocket?.off('disconnect', onDisconnect);
    };
  }, []);

  return socketRef.current || globalSocket;
}

export function disconnectSocket() {
  if (globalSocket) { globalSocket.disconnect(); globalSocket = null; }
}

export function getSocket() { return globalSocket; }
