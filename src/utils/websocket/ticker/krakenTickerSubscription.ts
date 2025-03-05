
import { getKrakenWebSocket } from '../kraken/krakenWebSocketInstance';
import { debounceOperation, processPendingSubscriptions, addSubscription, removeSubscription, hasActiveSubscription, addPendingSubscription, removePendingSubscription } from '../subscription/krakenSubscriptionManager';
import { subscribeToTickers as subscribeTickers } from '../connectionUtils';

// Subscribe to ticker for multiple pairs
export const subscribeToTickers = (pairs: string[]): void => {
  const wsManager = getKrakenWebSocket();
  subscribeTickers(wsManager, pairs);
  
  // Track subscriptions
  pairs.forEach(pair => {
    addSubscription(pair);
  });
};

// Subscribe to ticker for a single pair
export const subscribeToTicker = (pair: string): void => {
  // Normalize pair format if needed
  const normalizedPair = pair.includes('/') ? pair : pair;
  
  const wsManager = getKrakenWebSocket();
  
  // If we're already subscribed, don't do anything
  if (hasActiveSubscription(normalizedPair)) {
    console.log(`Already subscribed to ${normalizedPair}, skipping redundant subscription`);
    return;
  }
  
  // If we're in the middle of subscribing/unsubscribing to this pair, debounce
  if (!debounceOperation(normalizedPair, 'subscribe')) {
    return;
  }
  
  // Always track the subscription attempt
  addPendingSubscription(normalizedPair);
  
  // Check connection status including demo mode
  if (!wsManager.isConnected() && !wsManager.isForceDemoMode()) {
    console.log('WebSocket not connected, connecting before subscribing...');
    
    // Store for later subscription after connection
    wsManager.connect()
      .then(() => {
        // Now that we're connected, subscribe to pending pairs
        processPendingSubscriptions(wsManager);
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
    
    addSubscription(normalizedPair);
    removePendingSubscription(normalizedPair);
  }
};

// Unsubscribe from ticker for a single pair
export const unsubscribeFromTicker = (pair: string): void => {
  // Normalize pair format if needed
  const normalizedPair = pair.includes('/') ? pair : pair;
  
  const wsManager = getKrakenWebSocket();
  
  // If we're not even subscribed, don't do anything
  if (!hasActiveSubscription(normalizedPair)) {
    console.log(`Not subscribed to ${normalizedPair}, skipping redundant unsubscription`);
    return;
  }
  
  // If we're in the middle of subscribing/unsubscribing to this pair, debounce
  if (!debounceOperation(normalizedPair, 'unsubscribe')) {
    return;
  }
  
  // Always remove from pending
  removePendingSubscription(normalizedPair);
  
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
    
    removeSubscription(normalizedPair);
  } else {
    console.warn(`Cannot unsubscribe from ${normalizedPair}: WebSocket not connected`);
    // Still remove from active subscriptions to prevent stale state
    removeSubscription(normalizedPair);
  }
};
