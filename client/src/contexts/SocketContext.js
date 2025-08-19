import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const { isAuthenticated, user, userType } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Create socket connection
      const newSocket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
        auth: {
          token: localStorage.getItem('token'),
          userType,
          userId: user._id,
        },
        transports: ['websocket', 'polling'],
      });

      // Socket event listeners
      newSocket.on('connect', () => {
        console.log('Socket connected');
        setIsConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setIsConnected(false);
      });

      // User-specific events
      if (userType === 'user') {
        newSocket.on('order_status_update', (data) => {
          console.log('Order status updated:', data);
          // Handle order status updates
        });

        newSocket.on('driver_location_update', (data) => {
          console.log('Driver location updated:', data);
          // Handle driver location updates
        });

        newSocket.on('payment_confirmed', (data) => {
          console.log('Payment confirmed:', data);
          // Handle payment confirmation
        });
      }

      if (userType === 'driver') {
        newSocket.on('new_order_assigned', (data) => {
          console.log('New order assigned:', data);
          // Handle new order assignment
        });

        newSocket.on('order_cancelled', (data) => {
          console.log('Order cancelled:', data);
          // Handle order cancellation
        });

        newSocket.on('station_ready', (data) => {
          console.log('Station ready:', data);
          // Handle station ready notification
        });
      }

      if (userType === 'station') {
        newSocket.on('new_order_received', (data) => {
          console.log('New order received:', data);
          // Handle new order received
        });

        newSocket.on('driver_arrived', (data) => {
          console.log('Driver arrived:', data);
          // Handle driver arrival
        });
      }

      setSocket(newSocket);

      // Cleanup on unmount
      return () => {
        newSocket.close();
      };
    } else {
      // Disconnect socket if not authenticated
      if (socket) {
        socket.close();
        setSocket(null);
        setIsConnected(false);
      }
    }
  }, [isAuthenticated, user, userType]);

  const emit = (event, data) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit event:', event);
    }
  };

  const on = (event, callback) => {
    if (socket) {
      socket.on(event, callback);
    }
  };

  const off = (event, callback) => {
    if (socket) {
      socket.off(event, callback);
    }
  };

  const value = {
    socket,
    isConnected,
    emit,
    on,
    off,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
