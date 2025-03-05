import { WebSocketCore } from './websocketCore';
import { WebSocketMessage } from '@/types/websocketTypes';

// Singleton instance for Kraken WebSocket
let krakenWsInstance: WebSocketCore | null = null;

export const getKrakenWebSocket = (): WebSocketCore => {
  if (!krakenWsInstance) {
    krakenWsInstance = new WebSocketCore('wss://ws.kraken.com');
  }
  return krakenWsInstance;
};

// Keep track of active subscriptions
const activeSubscriptions = new Set<string>();

// Subscribe to ticker for multiple pairs
export const subscribeToTickers = (pairs: string[]): void => {
  const wsManager = getKrakenWebSocket();
  
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
    return new Promise((resolve) => {
      const ws = new WebSocket('wss://ws.kraken.com');
      
      // Set a timeout in case the connection hangs
      const timeout = setTimeout(() => {
        ws.close();
        resolve(false);
      }, 5000);
      
      ws.onopen = () => {
        clearTimeout(timeout);
        ws.close();
        resolve(true);
      };
      
      ws.onerror = () => {
        clearTimeout(timeout);
        resolve(false);
      };
    });
  } catch (error) {
    console.error('Error checking WebSocket connection:', error);
    return false;
  }
};
