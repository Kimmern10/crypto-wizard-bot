
import { WebSocketCore } from './websocketCore';
import { WebSocketMessage } from '@/types/websocketTypes';
import { subscribeToTickers as subscribeTickers } from './connectionUtils';

// Singleton instance for Kraken WebSocket
let krakenWsInstance: WebSocketCore | null = null;

// Keep track of active subscriptions
const activeSubscriptions = new Set<string>();

// Pending subscriptions that will be processed once connected
const pendingSubscriptions = new Set<string>();

// Track subscription/unsubscription operations in progress to avoid bouncing
const pendingOperations = new Map<string, {
  type: 'subscribe' | 'unsubscribe',
  timestamp: number
}>();

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

// Helper function to debounce WebSocket operations
const debounceOperation = (pair: string, operationType: 'subscribe' | 'unsubscribe'): boolean => {
  const now = Date.now();
  const pendingOp = pendingOperations.get(pair);
  
  // If there's a pending operation for this pair and it's less than 2 seconds old
  if (pendingOp && now - pendingOp.timestamp < 2000) {
    console.log(`Debouncing ${operationType} for ${pair}, previous ${pendingOp.type} still in progress`);
    return false;
  }
  
  // Record this operation
  pendingOperations.set(pair, {
    type: operationType,
    timestamp: now
  });
  
  // Clean up old operations after 5 seconds
  setTimeout(() => {
    if (pendingOperations.get(pair)?.timestamp === now) {
      pendingOperations.delete(pair);
    }
  }, 5000);
  
  return true;
};

// Subscribe to ticker for a single pair
export const subscribeToTicker = (pair: string): void => {
  // Normalize pair format if needed
  const normalizedPair = pair.includes('/') ? pair : pair;
  
  const wsManager = getKrakenWebSocket();
  
  // If we're already subscribed, don't do anything
  if (activeSubscriptions.has(normalizedPair)) {
    console.log(`Already subscribed to ${normalizedPair}, skipping redundant subscription`);
    return;
  }
  
  // If we're in the middle of subscribing/unsubscribing to this pair, debounce
  if (!debounceOperation(normalizedPair, 'subscribe')) {
    return;
  }
  
  // Always track the subscription attempt
  pendingSubscriptions.add(normalizedPair);
  
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
    console.log(`Subscribing to ${normalizedPair} ticker in ${wsManager.isForceDemoMode() ? 'demo' : 'real'} mode...`);
    
    // Using correct Kraken WebSocket API subscription format
    wsManager.send({
      event: "subscribe",
      pair: [normalizedPair],
      subscription: {
        name: "ticker"
      }
    });
    
    activeSubscriptions.add(normalizedPair);
    pendingSubscriptions.delete(normalizedPair);
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
  // Normalize pair format if needed
  const normalizedPair = pair.includes('/') ? pair : pair;
  
  const wsManager = getKrakenWebSocket();
  
  // If we're not even subscribed, don't do anything
  if (!activeSubscriptions.has(normalizedPair)) {
    console.log(`Not subscribed to ${normalizedPair}, skipping redundant unsubscription`);
    return;
  }
  
  // If we're in the middle of subscribing/unsubscribing to this pair, debounce
  if (!debounceOperation(normalizedPair, 'unsubscribe')) {
    return;
  }
  
  // Always remove from pending
  pendingSubscriptions.delete(normalizedPair);
  
  if (wsManager.isConnected() || wsManager.isForceDemoMode()) {
    console.log(`Unsubscribing from ${normalizedPair} ticker...`);
    
    // Using correct Kraken WebSocket API unsubscription format
    wsManager.send({
      event: "unsubscribe",
      pair: [normalizedPair],
      subscription: {
        name: "ticker"
      }
    });
    
    activeSubscriptions.delete(normalizedPair);
  } else {
    console.warn(`Cannot unsubscribe from ${normalizedPair}: WebSocket not connected`);
    // Still remove from active subscriptions to prevent stale state
    activeSubscriptions.delete(normalizedPair);
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
