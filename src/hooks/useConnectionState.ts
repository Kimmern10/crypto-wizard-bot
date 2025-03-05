
import { useState, useEffect } from 'react';
import { getConnectionStatus, initializeWebSocket, restartWebSocket } from '@/utils/websocketManager';
import { toast } from 'sonner';

export const useConnectionState = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [lastConnectionCheck, setLastConnectionCheck] = useState(0);

  // First initialization
  useEffect(() => {
    console.log('Initializing WebSocket connection...');
    initializeWebSocket();
    setIsInitializing(false);
  }, []);

  // Periodic connection check
  useEffect(() => {
    const connectionCheckInterval = setInterval(() => {
      setLastConnectionCheck(Date.now());
    }, 5000);
    
    return () => clearInterval(connectionCheckInterval);
  }, []);

  const restartConnection = async (): Promise<void> => {
    try {
      toast.info('Restarting WebSocket connection...');
      await restartWebSocket();
      toast.success('WebSocket connection restarted');
    } catch (error) {
      console.error('Error restarting WebSocket connection:', error);
      toast.error('Failed to restart WebSocket connection');
    }
  };

  // Get the true connection status including demo mode
  const { isConnected: wsConnected, isDemoMode } = getConnectionStatus();
  
  return {
    isInitializing,
    lastConnectionCheck,
    restartConnection,
    wsConnected,
    isDemoMode
  };
};
