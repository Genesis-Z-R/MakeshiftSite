import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  onlineCount: number;
  notifications: number;
  clearNotifications: () => void;
}

const SocketContext = createContext<SocketContextType>({ 
  socket: null, 
  onlineCount: 0, 
  notifications: 0,
  clearNotifications: () => {}
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [notifications, setNotifications] = useState(0);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('online_count', (count: number) => {
      setOnlineCount(count);
    });

    newSocket.on('new_message', () => {
      // Increment notification count if user is not on messages page
      // We'll handle the "is on messages page" check in the component or just increment here
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
    }
  }, [socket, user]);

  return (
    <SocketContext.Provider value={{ socket, onlineCount, notifications, clearNotifications }}>
      {children}
    </SocketContext.Provider>
  );
};
