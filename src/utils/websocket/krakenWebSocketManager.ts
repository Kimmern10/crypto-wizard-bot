
import { WebSocketCore } from './websocketCore';
import { WebSocketMessage } from '@/types/websocketTypes';

// Singleton instance for Kraken WebSocket
let krakenWsInstance: WebSocketCore | null = null;

export const getKrakenWebSocket = (): WebSocketCore => {
  if (!krakenWsInstance) {
    // Create new WebSocket instance with better connection parameters
    krakenWsInstance = new WebSocketCore('wss://ws.kraken.com');
    console.log('Created new Kraken WebSocket instance');
  }
  return krakenWsInstance;
};

// Keep track of active subscriptions
const activeSubscriptions = new Set<string>();

// Subscribe to ticker for multiple pairs
export const subscribeToTickers = (pairs: string[]): void => {
  const wsManager = getKrakenWebSocket();
  
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
        wsManager.send({
          method: 'subscribe',
          params: {
            name: 'ticker',
            pair: [pair]
          }
        });
        activeSubscriptions.add(pair);
      } else {
        console.warn(`Cannot subscribe to ${pair}: WebSocket not connected`);
      }
    }, index * 300); // 300ms delay between subscriptions
  });
};

// Subscribe to ticker for a single pair
export const subscribeToTicker = (pair: string): void => {
  const wsManager = getKrakenWebSocket();
  
  // Connect first if not connected
  if (!wsManager.isConnected()) {
    console.log('WebSocket not connected, connecting before subscribing...');
    wsManager.connect().catch(err => {
      console.error('Failed to connect WebSocket before subscribing:', err);
    });
  }
  
  // Only subscribe if not already subscribed
  if (!activeSubscriptions.has(pair)) {
    if (wsManager.isConnected()) {
      console.log(`Subscribing to ${pair} ticker...`);
      wsManager.send({
        method: 'subscribe',
        params: {
          name: 'ticker',
          pair: [pair]
        }
      });
      activeSubscriptions.add(pair);
    } else {
      console.warn(`Cannot subscribe to ${pair}: WebSocket not connected`);
    }
  }
};

// Unsubscribe from ticker for a single pair
export const unsubscribeFromTicker = (pair: string): void => {
  const wsManager = getKrakenWebSocket();
  
  if (activeSubscriptions.has(pair)) {
    if (wsManager.isConnected()) {
      console.log(`Unsubscribing from ${pair} ticker...`);
      wsManager.send({
        method: 'unsubscribe',
        params: {
          name: 'ticker',
          pair: [pair]
        }
      });
      activeSubscriptions.delete(pair);
    } else {
      console.warn(`Cannot unsubscribe from ${pair}: WebSocket not connected`);
    }
  }
};

// Get list of active subscriptions
export const getActiveSubscriptions = (): string[] => {
  return Array.from(activeSubscriptions);
};

// Function to check if WebSocket connection is possible
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
          ws.send(JSON.stringify({ op: 'ping' }));
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
