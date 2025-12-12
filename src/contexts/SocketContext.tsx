import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

// Get the base URL for Socket.IO (remove /api suffix if present)
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/api$/, '');

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [token] = useState(() => localStorage.getItem('token'));

  useEffect(() => {
    // Only connect if user is authenticated
    if (!token) {
      console.log('🔌 No token found, skipping WebSocket connection');
      return;
    }

    console.log('🔌 Initializing WebSocket connection to:', API_URL);
    console.log('🔌 Token exists:', token ? 'Yes (length: ' + token.length + ')' : 'No');

    // Create socket connection
    const newSocket = io(API_URL, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'], // Try WebSocket first, fallback to polling
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('✅ WebSocket connected successfully!');
      console.log('   - Socket ID:', newSocket.id);
      console.log('   - Transport:', newSocket.io.engine.transport.name);
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('⚠️ WebSocket connection error:', error.message);
      console.error('   - Error details:', error);
      setIsConnected(false);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 WebSocket reconnected after ${attemptNumber} attempts`);
      setIsConnected(true);
    });

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 WebSocket reconnection attempt ${attemptNumber}`);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('❌ WebSocket reconnection failed after all attempts');
      setIsConnected(false);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      console.log('🔌 Disconnecting WebSocket...');
      newSocket.close();
      setSocket(null);
      setIsConnected(false);
    };
  }, [token]); // Recreate socket when token changes

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
