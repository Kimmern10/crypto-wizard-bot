import { WebSocketCore } from '../websocketCore';

// Keep track of active subscriptions
const activeSubscriptions = new Set<string>();

// Pending subscriptions that will be processed once connected
const pendingSubscriptions = new Set<string>();

// Track subscription/unsubscription operations in progress to avoid bouncing
const pendingOperations = new Map<string, {
  type: 'subscribe' | 'unsubscribe',
  timestamp: number
}>();

// Helper function to debounce WebSocket operations
export const debounceOperation = (pair: string, operationType: 'subscribe' | 'unsubscribe'): boolean => {
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

// Process any pending subscriptions
export function processPendingSubscriptions(wsManager: WebSocketCore): void {
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

// Get list of active subscriptions
export const getActiveSubscriptions = (): string[] => {
  return Array.from(activeSubscriptions);
};

// Add a subscription to the managed set
export const addSubscription = (pair: string): void => {
  activeSubscriptions.add(pair);
};

// Remove a subscription from the managed set
export const removeSubscription = (pair: string): void => {
  activeSubscriptions.delete(pair);
};

// Add a pending subscription
export const addPendingSubscription = (pair: string): void => {
  pendingSubscriptions.add(pair);
};

// Remove a pending subscription
export const removePendingSubscription = (pair: string): void => {
  pendingSubscriptions.delete(pair);
};

// Check if a pair is in the pending subscriptions
export const hasPendingSubscription = (pair: string): boolean => {
  return pendingSubscriptions.has(pair);
};

// Check if a pair is already subscribed
export const hasActiveSubscription = (pair: string): boolean => {
  return activeSubscriptions.has(pair);
}

// Clear all pending subscriptions
export const clearPendingSubscriptions = (): void => {
  pendingSubscriptions.clear();
};
