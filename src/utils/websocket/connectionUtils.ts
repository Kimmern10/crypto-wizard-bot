
import { toast } from 'sonner';
import { WebSocketCore } from './websocketCore';

/**
 * Checks if a WebSocket connection is possible
 */
export const checkWebSocketConnection = async (): Promise<boolean> => {
  try {
    console.log('Testing WebSocket connection to Kraken...');
    
    return new Promise((resolve) => {
      // Test connection with increased timeout and better error handling
      const ws = new WebSocket('wss://ws.kraken.com');
      
      // Set a timeout in case the connection hangs
      const timeout = setTimeout(() => {
        console.warn('WebSocket connection test timed out');
        try {
          ws.close();
        } catch (e) {
          // Ignore close errors
        }
        resolve(false);
      }, 7000);  // Increased timeout for slower connections
      
      ws.onopen = () => {
        console.log('WebSocket connection test successful');
        clearTimeout(timeout);
        // Send a ping to verify connection is working
        try {
          ws.send(JSON.stringify({ event: 'ping' }));
          setTimeout(() => {
            ws.close();
            resolve(true);
          }, 300);
        } catch (error) {
          console.error('Error sending ping during connection test:', error);
          ws.close();
          resolve(false);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket connection test error:', error);
        clearTimeout(timeout);
        try {
          ws.close();
        } catch (e) {
          // Ignore close errors
        }
        resolve(false);
      };
    });
  } catch (error) {
    console.error('Error in WebSocket connection check:', error);
    return false;
  }
};

/**
 * Checks if there are CORS restrictions
 */
export const checkCorsRestrictions = async (): Promise<boolean> => {
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
};

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

/**
 * Subscribes to ticker data for multiple pairs
 */
export const subscribeToTickers = (wsManager: WebSocketCore, pairs: string[]): void => {
  // Connect first if not connected
  if (!wsManager.isConnected()) {
    console.log('WebSocket not connected, connecting before subscribing...');
    wsManager.connect().catch(err => {
      console.error('Failed to connect WebSocket before subscribing:', err);
    });
  }
  
  // Subscribe to each pair individually with a small delay
  // to avoid overwhelming the WebSocket
  pairs.forEach((pair, index) => {
    setTimeout(() => {
      if (wsManager.isConnected()) {
        console.log(`Subscribing to ${pair} ticker...`);
        // FIXED: Use correct Kraken WebSocket API subscription format
        wsManager.send({
          event: "subscribe",
          pair: [pair],
          subscription: {
            name: "ticker"
          }
        });
      } else {
        console.warn(`Cannot subscribe to ${pair}: WebSocket not connected`);
      }
    }, index * 300); // 300ms delay between subscriptions
  });
};
