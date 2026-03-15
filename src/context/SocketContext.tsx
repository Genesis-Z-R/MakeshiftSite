import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  onlineUsers: string[];
  notifications: number;
  clearNotifications: () => void;
  typingUsers: Map<string, boolean>; // key: "userId_listingId"
}

const SocketContext = createContext<SocketContextType>({ 
  socket: null, 
  onlineUsers: [], 
  notifications: 0,
  clearNotifications: () => {},
  typingUsers: new Map()
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [notifications, setNotifications] = useState(0);
  const [typingUsers, setTypingUsers] = useState<Map<string, boolean>>(new Map());

  useEffect(() => {
  // 1. We specify the backend URL
  // 2. We add configuration options to match the backend 'transports'
  const newSocket = io(import.meta.env.VITE_API_URL || undefined, {
    transports: ['websocket', 'polling'], // Explicitly allow both
    withCredentials: true,
    autoConnect: true,
    reconnectionAttempts: 5
  });

  setSocket(newSocket);

  // Error handling to help us debug if it still fails
  newSocket.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message);
  });

  newSocket.on('online_users', (users: string[]) => {
    setOnlineUsers(users);
  });

  newSocket.on('user_typing', (data: { sender_id: string; listing_id: number }) => {
    setTypingUsers(prev => {
      const next = new Map(prev);
      next.set(`${data.sender_id}_${data.listing_id}`, true);
      return next;
    });
  });

  newSocket.on('user_stop_typing', (data: { sender_id: string; listing_id: number }) => {
    setTypingUsers(prev => {
      const next = new Map(prev);
      next.delete(`${data.sender_id}_${data.listing_id}`);
      return next;
    });
  });

  newSocket.on('new_message', () => {
    setNotifications(prev => prev + 1);
  });

  return () => {
    newSocket.disconnect();
  };
}, []);

  const clearNotifications = () => setNotifications(0);

  useEffect(() => {
    if (socket && user) {
      socket.emit('authenticate', user.id);
      
      // Re-authenticate on reconnect
      socket.on('connect', () => {
        socket.emit('authenticate', user.id);
      });
    }
  }, [socket, user]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers, notifications, clearNotifications, typingUsers }}>
      {children}
    </SocketContext.Provider>
  );
};
