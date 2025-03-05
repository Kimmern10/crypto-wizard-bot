
import { toast } from 'sonner';
import { WebSocketMessage } from '@/types/websocketTypes';
import { WebSocketCore } from './websocketCore';
import { checkWebSocketConnection, subscribeToTickers } from './krakenWebSocketManager';
import { simulateDemoTickerData } from './demoDataGenerator';

export const setupWebSocket = (
  wsManager: WebSocketCore, 
  setConnectionStatus: (status: string) => void,
  setLastConnectionEvent: (event: string) => void,
  setLastTickerData: (updateFn: (prev: Record<string, any>) => Record<string, any>) => void
) => {
  // Log connecting status
  setConnectionStatus('Checking connection method...');
  console.log('Determining best connection method for Kraken...');
  
  // Track demo mode reason if needed
  let demoModeReason = '';
  let demoModeActive = false;
  let cleanupDemoData: (() => void) | null = null;
  
  // Check if we can connect to WebSocket directly with improved error handling
  checkWebSocketConnection()
    .then(canConnectWebSocket => {
      if (canConnectWebSocket) {
        console.log('Direct WebSocket connection is possible, connecting...');
        setConnectionStatus('Direct connection available, connecting...');
        return connectAndSubscribe();
      } else {
        console.log('Direct WebSocket connection not available, checking CORS restrictions...');
        setConnectionStatus('Testing alternative connection methods...');
        
        // Check for CORS restrictions
        return checkCorsRestrictions().then(hasCorsRestrictions => {
          if (hasCorsRestrictions) {
            console.log('CORS restrictions detected, using proxy connection...');
            demoModeReason = 'CORS restrictions';
            // Try to connect via proxy in future implementation
            // For now, activate demo mode
            demoModeActive = true;
            wsManager.setForceDemoMode(true);
            
            // Start demo data generation
            cleanupDemoData = simulateDemoTickerData(setLastTickerData);
            
            // Notify the UI about the fallback
            setConnectionStatus(`Demo Mode (${demoModeReason})`);
            setLastConnectionEvent(`Switched to demo mode at ${new Date().toLocaleTimeString()}`);
            
            toast.warning('Using demo mode due to CORS restrictions. Real-time data not available.', {
              duration: 5000,
            });
            
            // Return cleanup function
            return () => {
              if (cleanupDemoData) cleanupDemoData();
              wsManager.disconnect();
            };
          } else {
            console.log('No CORS restrictions, but WebSocket still unavailable. Trying alternative method...');
            // Try one more direct connection attempt with different parameters
            wsManager.setConnectionAttempts(10); // Increase retry count
            return connectAndSubscribe();
          }
        });
      }
    })
    .catch(error => {
      console.error('Error checking WebSocket connection:', error);
      demoModeReason = 'connection check failed';
      
      // Fallback to demo mode
      demoModeActive = true;
      wsManager.setForceDemoMode(true);
      cleanupDemoData = simulateDemoTickerData(setLastTickerData);
      
      // Notify the UI
      setConnectionStatus(`Demo Mode (${demoModeReason})`);
      setLastConnectionEvent(`Error at ${new Date().toLocaleTimeString()}`);
      
      toast.error('Failed to establish WebSocket connection', {
        description: 'Using demo mode with simulated data',
        duration: 5000,
      });
      
      return () => {
        if (cleanupDemoData) cleanupDemoData();
        wsManager.disconnect();
      };
    });
  
  // Function to check if there are CORS restrictions
  async function checkCorsRestrictions(): Promise<boolean> {
    try {
      console.log('Testing CORS restrictions with Kraken API...');
      
      // Try to make a simple GET request to Kraken public API
      const response = await fetch('https://api.kraken.com/0/public/Time', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Important: Do not use no-cors mode so we can detect CORS errors
      });
      
      // If we get here without error, CORS is allowed
      console.log('CORS check successful:', response.status);
      return false;
    } catch (error) {
      // If we get an error, it's likely due to CORS restrictions
      console.error('CORS check failed:', error);
      return true;
    }
  }
  
  const connectAndSubscribe = () => {
    // Track reconnection attempts for UI feedback
    let reconnectCount = 0;
    
    setConnectionStatus('Connecting to Kraken WebSocket...');
    console.log('Attempting to connect to Kraken WebSocket...');
    
    wsManager.connect()
      .then(() => {
        setConnectionStatus('Connected to WebSocket');
        setLastConnectionEvent(`Connected at ${new Date().toLocaleTimeString()}`);
        console.log('Successfully connected to Kraken WebSocket');
        
        // Only show toast on initial connection or after multiple reconnects
        if (reconnectCount === 0 || reconnectCount > 2) {
          toast.success('Connected to Kraken WebSocket');
        }
        
        // Reset reconnect counter on successful connection
        reconnectCount = 0;
        
        // Subscribe to ticker data for multiple pairs
        const pairs = ['XBT/USD', 'ETH/USD', 'XRP/USD', 'DOT/USD', 'ADA/USD'];
        subscribeToTickers(pairs);
      })
      .catch(error => {
        reconnectCount++;
        console.error('WebSocket connection failed:', error);
        setConnectionStatus(`WebSocket connection failed (attempt ${reconnectCount})`);
        setLastConnectionEvent(`Failed at ${new Date().toLocaleTimeString()}`);
        
        // Only show toast on initial failure or after multiple reconnects
        if (reconnectCount === 1 || reconnectCount % 3 === 0) {
          toast.error('Failed to connect to Kraken WebSocket');
        }
        
        // Fallback to demo data after multiple reconnection failures
        if (reconnectCount >= 3 && !demoModeActive) {
          console.log('Multiple WebSocket connection failures, switching to demo data');
          demoModeActive = true;
          wsManager.setForceDemoMode(true);
          cleanupDemoData = simulateDemoTickerData(setLastTickerData);
          setConnectionStatus('Demo Mode (WebSocket connection failed)');
          
          toast.warning('Switched to demo mode after multiple connection failures', {
            duration: 5000,
          });
          
          return () => {
            if (cleanupDemoData) cleanupDemoData();
          };
        }
      });
    
    // Register handler for incoming messages
    const unsubscribe = wsManager.subscribe((message: WebSocketMessage) => {
      try {
        if (message.type === 'ticker') {
          // Update ticker data in state
          setLastTickerData(prev => ({
            ...prev,
            [message.data.pair]: {
              ...message.data,
              timestamp: new Date().toISOString()
            }
          }));
          
          console.log(`Received ticker data for ${message.data.pair}`);
        } else if (message.type === 'systemStatus') {
          console.log('Received system status:', message.data);
          setConnectionStatus(`System Status: ${message.data.status}`);
          setLastConnectionEvent(`Status update at ${new Date().toLocaleTimeString()}`);
        } else if (message.type === 'heartbeat') {
          console.log('Received heartbeat');
        } else if (message.type === 'error') {
          console.error('WebSocket error message:', message.data);
          setConnectionStatus(`Error: ${message.data.errorMessage || 'Unknown error'}`);
          setLastConnectionEvent(`Error at ${new Date().toLocaleTimeString()}`);
          toast.error(`WebSocket error: ${message.data.errorMessage || 'Unknown error'}`);
        } else if (message.type === 'connectionStatus') {
          console.log('Connection status change:', message.data);
          setConnectionStatus(message.data.message || message.data.status);
          setLastConnectionEvent(`Status change at ${new Date().toLocaleTimeString()}`);
        } else if (message.type === 'modeChange') {
          console.log('Mode change:', message.data);
          demoModeActive = message.data.isDemoMode;
          setConnectionStatus(`Demo Mode (${message.data.reason})`);
          setLastConnectionEvent(`Mode change at ${new Date().toLocaleTimeString()}`);
        } else {
          console.log('Received other message type:', message.type, message.data);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });
    
    return unsubscribe;
  };
  
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
