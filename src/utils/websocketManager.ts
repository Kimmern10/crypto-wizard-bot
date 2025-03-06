
// Re-export the WebSocketCore and getKrakenWebSocket from new modular structure
import { WebSocketCore } from './websocket/websocketCore';
import { 
  getKrakenWebSocket, 
  subscribeToTickers, 
  getConnectionStatus 
} from './websocket/krakenWebSocketManager';
import { checkProxyFunction } from './websocket/connection/connectionTester';
import type { WebSocketMessage } from '@/types/websocketTypes';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Track initialization status
let isInitialized = false;
let isProxyAvailable = false;

// Export a function to check for availability of the Kraken proxy
export const checkKrakenProxyStatus = async (): Promise<boolean> => {
  console.log('Checking Kraken proxy status...');
  try {
    const proxyCheckStart = Date.now();
    isProxyAvailable = await checkProxyFunction();
    const proxyCheckTime = Date.now() - proxyCheckStart;
    console.log(`Proxy check completed in ${proxyCheckTime}ms: ${isProxyAvailable ? 'AVAILABLE' : 'UNAVAILABLE'}`);
    return isProxyAvailable;
  } catch (error) {
    console.error('Error checking proxy status:', error);
    return false;
  }
};

// Export a function to initialize the WebSocket connection
export const initializeWebSocket = () => {
  // Prevent multiple initialization
  if (isInitialized) {
    console.log('WebSocket already initialized, reusing existing connection');
    return getKrakenWebSocket();
  }
  
  console.log('Initializing WebSocket connection...');
  const ws = getKrakenWebSocket();
  
  // Check proxy availability
  checkKrakenProxyStatus().then(available => {
    if (!available) {
      console.warn('Kraken proxy function is not available. API operations will be limited.');
      toast.warning('Kraken API proxy unavailable. Some features may not work.', {
        description: 'The connection to Kraken API might be using demo mode.',
        duration: 6000
      });
    } else {
      console.log('Kraken proxy available! Full functionality enabled.');
      toast.success('Kraken API proxy connected', {
        description: 'Successfully connected to Kraken API proxy.',
        duration: 3000
      });
    }
    
    // Continue with WebSocket connection regardless of proxy status
    return ws.connect();
  })
  .catch(error => {
    console.error('Failed to initialize WebSocket connection:', error);
    // Don't enable demo mode here - let the connection utils handle that decision
  });
  
  isInitialized = true;
  return ws;
};

// Function to restart the WebSocket connection
export const restartWebSocket = async () => {
  console.log('Restarting WebSocket connection...');
  const ws = getKrakenWebSocket();
  
  // First check the proxy status
  const proxyAvailable = await checkKrakenProxyStatus();
  if (!proxyAvailable) {
    toast.warning('Kraken API proxy unavailable', {
      description: 'Connection might use demo mode. Check Supabase Edge Functions.',
      duration: 5000
    });
  } else {
    toast.success('Kraken API proxy available', {
      description: 'Connected to Kraken API successfully.',
      duration: 3000 
    });
  }
  
  // First disconnect if connected
  if (ws.isConnected()) {
    console.log('Disconnecting current WebSocket connection...');
    ws.disconnect();
    
    // Short delay to ensure proper disconnect before reconnect
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Clear demo mode only if proxy is available
  if (proxyAvailable) {
    ws.setForceDemoMode(false);
  }
  
  // Try to reconnect
  return ws.connect().catch(error => {
    console.error('Failed to restart WebSocket connection:', error);
    
    // If connection fails, activate demo mode after a short delay
    setTimeout(() => {
      if (!ws.isConnected() && !ws.isForceDemoMode()) {
        console.log('Connection failed after restart, activating demo mode');
        ws.setForceDemoMode(true);
      }
    }, 3000);
  });
};

// Add a utility function to check WebSocket status
export const checkWebSocketStatus = () => {
  const ws = getKrakenWebSocket();
  return {
    isConnected: ws.isConnected(),
    isDemoMode: ws.isForceDemoMode(),
    isProxyAvailable,
    activeSubscriptions: ws.getActiveSubscriptions(),
    isInitialized
  };
};

export { 
  WebSocketCore, 
  getKrakenWebSocket, 
  subscribeToTickers, 
  getConnectionStatus,
  type WebSocketMessage 
};
