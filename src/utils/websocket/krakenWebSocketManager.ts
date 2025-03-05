
// Re-export all functionality from the modular files
import { getKrakenWebSocket, getConnectionStatus } from './kraken/krakenWebSocketInstance';
import { subscribeToTickers, subscribeToTicker, unsubscribeFromTicker } from './ticker/krakenTickerSubscription';
import { getActiveSubscriptions } from './subscription/krakenSubscriptionManager';
import { checkWebSocketConnection } from './connectionUtils';
import { WebSocketMessage } from '@/types/websocketTypes';

// Export the connection checker from connectionUtils
export { checkWebSocketConnection };

// Export the main functionality
export {
  getKrakenWebSocket,
  getConnectionStatus,
  subscribeToTickers,
  subscribeToTicker,
  unsubscribeFromTicker,
  getActiveSubscriptions,
  type WebSocketMessage
};
