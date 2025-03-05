
import { toast } from 'sonner';
import { WebSocketMessage } from '@/types/websocketTypes';
import { WebSocketCore } from './websocketCore';
import { checkWebSocketConnection, checkCorsRestrictions, connectAndSubscribe } from './connectionUtils';
import { activateDemoMode, handleConnectionFailure } from './demoModeHandler';
import { handleWebSocketMessage } from './messageHandler';

export const setupWebSocket = (
  wsManager: WebSocketCore, 
  setConnectionStatus: (status: string) => void,
  setLastConnectionEvent: (event: string) => void,
  setLastTickerData: (updateFn: (prev: Record<string, any>) => Record<string, any>) => void
) => {
  // Log connecting status
  setConnectionStatus('Checking connection method...');
  console.log('Determining best connection method for Kraken...');
  
  // Track demo mode state
  let demoModeReason = '';
  let demoModeActive = false;
  let cleanupDemoData: (() => void) | null = null;
  
  // Process all incoming WebSocket messages
  const messageHandler = (message: WebSocketMessage) => {
    handleWebSocketMessage(
      message,
      setConnectionStatus,
      setLastConnectionEvent,
      setLastTickerData
    );
  };
  
  // Check if we can connect to WebSocket directly
  checkWebSocketConnection()
    .then(canConnectWebSocket => {
      if (canConnectWebSocket) {
        console.log('Direct WebSocket connection is possible, connecting...');
        setConnectionStatus('Direct connection available, connecting...');
        return connectAndSubscribe(wsManager, setConnectionStatus, setLastConnectionEvent, messageHandler);
      } else {
        console.log('Direct WebSocket connection not available, checking CORS restrictions...');
        setConnectionStatus('Testing alternative connection methods...');
        
        // Check for CORS restrictions
        return checkCorsRestrictions().then(hasCorsRestrictions => {
          if (hasCorsRestrictions) {
            console.log('CORS restrictions detected, using proxy connection...');
            demoModeReason = 'CORS restrictions';
            // Activate demo mode
            demoModeActive = true;
            cleanupDemoData = activateDemoMode(
              demoModeReason,
              wsManager,
              setConnectionStatus,
              setLastConnectionEvent,
              setLastTickerData
            );
            return () => {
              if (cleanupDemoData) cleanupDemoData();
            };
          } else {
            console.log('No CORS restrictions, but WebSocket still unavailable. Trying alternative method...');
            // Try one more direct connection attempt with different parameters
            wsManager.setConnectionAttempts(10); // Increase retry count
            return connectAndSubscribe(wsManager, setConnectionStatus, setLastConnectionEvent, messageHandler);
          }
        });
      }
    })
    .catch(error => {
      console.error('Error checking WebSocket connection:', error);
      demoModeReason = 'connection check failed';
      
      // Fallback to demo mode
      demoModeActive = true;
      cleanupDemoData = activateDemoMode(
        demoModeReason,
        wsManager,
        setConnectionStatus,
        setLastConnectionEvent,
        setLastTickerData
      );
    });
  
  // Return a cleanup function
  return () => {
    try {
      if (cleanupDemoData) {
        cleanupDemoData();
      }
      
      if (wsManager && wsManager.isConnected()) {
        wsManager.disconnect();
        console.log('WebSocket connection closed by cleanup');
      }
    } catch (error) {
      console.error('Error during WebSocket cleanup:', error);
    }
  };
};
