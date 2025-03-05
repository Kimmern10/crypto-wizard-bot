import { WebSocketCore } from './websocketCore';
import { WebSocketMessage } from '@/types/websocketTypes';
import { subscribeToTickers as subscribeTickers } from './connectionUtils';

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
  subscribeTickers(wsManager, pairs);
  
  // Track subscriptions
  pairs.forEach(pair => {
    activeSubscriptions.add(pair);
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

// Re-export checkWebSocketConnection from connectionUtils
export { checkWebSocketConnection } from './connectionUtils';
