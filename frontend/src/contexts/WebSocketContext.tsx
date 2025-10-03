import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastUpdate: any;
  sendMessage: (event: string, data: any) => void;
  joinRoom: (roomName: string) => void;
  leaveRoom: (roomName: string) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastUpdate, setLastUpdate] = useState<any>(null);
  const { user } = useAuth();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!user || !token) {
      // Disconnect if no user or token
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
        setConnectionStatus('disconnected');
      }
      return;
    }

    // Initialize Socket.IO connection
    const initializeSocket = async () => {
      try {
        setConnectionStatus('connecting');
        
        const newSocket = io((import.meta as any).env.VITE_WS_URL || 'http://localhost:5000', {
          auth: {
            token: token
          },
          transports: ['websocket', 'polling']
        });

        // Connection event handlers
        newSocket.on('connect', () => {
          console.log('🔌 WebSocket connected:', newSocket.id);
          setIsConnected(true);
          setConnectionStatus('connected');
          
          // Authenticate with user data
          newSocket.emit('authenticate', {
            userId: user._id,
            userRole: user.role
          });
        });

        newSocket.on('disconnect', (reason) => {
          console.log('🔌 WebSocket disconnected:', reason);
          setIsConnected(false);
          setConnectionStatus('disconnected');
        });

        newSocket.on('connect_error', (error) => {
          console.error('🔌 WebSocket connection error:', error);
          setConnectionStatus('error');
        });

        // Authentication confirmation
        newSocket.on('authenticated', (data) => {
          console.log('✅ WebSocket authenticated:', data);
        });

        // Approval update events
        newSocket.on('approval_updated', (data) => {
          console.log('📡 Received approval update:', data);
          setLastUpdate({
            type: 'approval_updated',
            data,
            timestamp: new Date()
          });
        });

        // Document update events
        newSocket.on('document_updated', (data) => {
          console.log('📡 Received document update:', data);
          setLastUpdate({
            type: 'document_updated',
            data,
            timestamp: new Date()
          });
        });

        // User activity events
        newSocket.on('user_activity', (data) => {
          console.log('📡 Received user activity:', data);
          setLastUpdate({
            type: 'user_activity',
            data,
            timestamp: new Date()
          });
        });

        // Notification events
        newSocket.on('notification', (data) => {
          console.log('📡 Received notification:', data);
          setLastUpdate({
            type: 'notification',
            data,
            timestamp: new Date()
          });
        });

        // System message events
        newSocket.on('system_message', (data) => {
          console.log('📡 Received system message:', data);
          setLastUpdate({
            type: 'system_message',
            data,
            timestamp: new Date()
          });
        });

        setSocket(newSocket);

      } catch (error) {
        console.error('❌ Failed to initialize WebSocket:', error);
        setConnectionStatus('error');
      }
    };

    initializeSocket();

    // Cleanup on unmount or user change
    return () => {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
        setConnectionStatus('disconnected');
      }
    };
  }, [user, token]);

  const sendMessage = (event: string, data: any) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    } else {
      console.warn('⚠️ WebSocket not connected, cannot send message');
    }
  };

  const joinRoom = (roomName: string) => {
    if (socket && isConnected) {
      socket.emit('join_room', roomName);
    } else {
      console.warn('⚠️ WebSocket not connected, cannot join room');
    }
  };

  const leaveRoom = (roomName: string) => {
    if (socket && isConnected) {
      socket.emit('leave_room', roomName);
    } else {
      console.warn('⚠️ WebSocket not connected, cannot leave room');
    }
  };

  const value: WebSocketContextType = {
    socket,
    isConnected,
    connectionStatus,
    lastUpdate,
    sendMessage,
    joinRoom,
    leaveRoom
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export default WebSocketContext;
