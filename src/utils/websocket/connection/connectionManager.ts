
import { toast } from 'sonner';
import { WebSocketCore } from '../websocketCore';
import { subscribeToTickers } from './subscriptionManager';

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
