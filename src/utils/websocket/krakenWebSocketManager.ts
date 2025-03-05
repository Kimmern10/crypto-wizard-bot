import { WebSocketCore } from './websocketCore';
import { WebSocketMessage } from '@/types/websocketTypes';
import { subscribeToTickers as subscribeTickers } from './connectionUtils';

// Singleton instance for Kraken WebSocket
let krakenWsInstance: WebSocketCore | null = null;

// Keep track of active subscriptions
const activeSubscriptions = new Set<string>();

// Pending subscriptions that will be processed once connected
const pendingSubscriptions = new Set<string>();

export const getKrakenWebSocket = (): WebSocketCore => {
  if (!krakenWsInstance) {
    // Create new WebSocket instance with better connection parameters
    krakenWsInstance = new WebSocketCore('wss://ws.kraken.com');
    console.log('Created new Kraken WebSocket instance');
  }
  return krakenWsInstance;
};

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
  
  // Always track the subscription attempt
  pendingSubscriptions.add(pair);
  
  // Check connection status including demo mode
  if (!wsManager.isConnected() && !wsManager.isForceDemoMode()) {
    console.log('WebSocket not connected, connecting before subscribing...');
    
    // Store for later subscription after connection
    wsManager.connect()
      .then(() => {
        // Now that we're connected, subscribe to pending pairs
        processPendingSubscriptions();
      })
      .catch(err => {
        console.error('Failed to connect WebSocket before subscribing:', err);
      });
  } else {
    // We're either connected or in demo mode, so we can subscribe immediately
    if (!activeSubscriptions.has(pair)) {
      console.log(`Subscribing to ${pair} ticker in ${wsManager.isForceDemoMode() ? 'demo' : 'real'} mode...`);
      
      // Using correct Kraken WebSocket API subscription format
      wsManager.send({
        event: "subscribe",
        pair: [pair],
        subscription: {
          name: "ticker"
        }
      });
      
      activeSubscriptions.add(pair);
      pendingSubscriptions.delete(pair);
    }
  }
};

// Process any pending subscriptions
function processPendingSubscriptions(): void {
  const wsManager = getKrakenWebSocket();
  
  if (pendingSubscriptions.size === 0) {
    return;
  }
  
  console.log(`Processing ${pendingSubscriptions.size} pending subscriptions...`);
  
  if (wsManager.isConnected() || wsManager.isForceDemoMode()) {
    const pendingPairs = Array.from(pendingSubscriptions);
    
    // Subscribe in batches to avoid overwhelming the connection
    const batchSize = 5;
    for (let i = 0; i < pendingPairs.length; i += batchSize) {
      const batch = pendingPairs.slice(i, i + batchSize);
      
      setTimeout(() => {
        batch.forEach(pair => {
          if (!activeSubscriptions.has(pair)) {
            console.log(`Processing pending subscription for ${pair}...`);
            
            // Using correct Kraken WebSocket API subscription format
            wsManager.send({
              event: "subscribe",
              pair: [pair],
              subscription: {
                name: "ticker"
              }
            });
            
            activeSubscriptions.add(pair);
            pendingSubscriptions.delete(pair);
          }
        });
      }, (i / batchSize) * 200); // 200ms delay between batches
    }
  }
}

// Unsubscribe from ticker for a single pair
export const unsubscribeFromTicker = (pair: string): void => {
  const wsManager = getKrakenWebSocket();
  
  // Always remove from pending
  pendingSubscriptions.delete(pair);
  
  if (activeSubscriptions.has(pair)) {
    if (wsManager.isConnected() || wsManager.isForceDemoMode()) {
      console.log(`Unsubscribing from ${pair} ticker...`);
      
      // Using correct Kraken WebSocket API unsubscription format
      wsManager.send({
        event: "unsubscribe",
        pair: [pair],
        subscription: {
          name: "ticker"
        }
      });
      
      activeSubscriptions.delete(pair);
    } else {
      console.warn(`Cannot unsubscribe from ${pair}: WebSocket not connected`);
      // Still remove from active subscriptions to prevent stale state
      activeSubscriptions.delete(pair);
    }
  }
};

// Get list of active subscriptions
export const getActiveSubscriptions = (): string[] => {
  return Array.from(activeSubscriptions);
};

// Re-export checkWebSocketConnection from connectionUtils
export { checkWebSocketConnection } from './connectionUtils';

// New function to check the overall connection status
export const getConnectionStatus = (): {isConnected: boolean, isDemoMode: boolean} => {
  const ws = getKrakenWebSocket();
  return {
    isConnected: ws.isConnected(),
    isDemoMode: ws.isForceDemoMode()
  };
};
