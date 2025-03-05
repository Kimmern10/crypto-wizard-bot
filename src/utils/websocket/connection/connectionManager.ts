
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { WebSocketCore } from '../websocketCore';
import { subscribeToTickers } from './subscriptionManager';
import { checkProxyFunction } from './connectionTester';

/**
 * Establishes a WebSocket connection and subscribes to channels
 */
export const connectAndSubscribe = (
  wsManager: WebSocketCore,
  setConnectionStatus: (status: string) => void,
  setLastConnectionEvent: (event: string) => void,
  onMessage: (message: any) => void
) => {
  // Track reconnection attempts for UI feedback
  let reconnectCount = 0;
  
  setConnectionStatus('Connecting to Kraken WebSocket...');
  console.log('Attempting to connect to Kraken WebSocket...');
  
  // First check if the Kraken proxy is working
  const proxyCheckTime = Date.now();
  checkProxyFunction().then(proxyAvailable => {
    console.log(`Proxy check completed in ${Date.now() - proxyCheckTime}ms`);
    
    if (!proxyAvailable) {
      console.warn('Kraken proxy function is not available. API operations will be limited.');
      toast.warning('Kraken API proxy unavailable. Some features may not work.', {
        description: 'The connection to Kraken API might be using demo mode.',
        duration: 6000
      });
    } else {
      console.log('Kraken proxy function is available! API operations should work properly.');
      toast.success('Kraken API proxy available', {
        description: 'Connected to Kraken API successfully.',
        duration: 3000
      });
    }
    
    // Continue with WebSocket connection regardless of proxy status
    return wsManager.connect();
  })
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
    subscribeToTickers(wsManager, pairs);
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
  });
  
  // Register handler for incoming messages
  return wsManager.subscribe(onMessage);
};
