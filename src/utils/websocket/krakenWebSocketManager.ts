
// Re-export all functionality from the modular files
import { getKrakenWebSocket, getConnectionStatus } from './kraken/krakenWebSocketInstance';
import { subscribeToTickers, subscribeToTicker, unsubscribeFromTicker } from './ticker/krakenTickerSubscription';
import { getActiveSubscriptions } from './subscription/krakenSubscriptionManager';
import { checkWebSocketConnection } from './connectionUtils';
import { WebSocketMessage } from '@/types/websocketTypes';

// Export the connection checker from connectionUtils
export { checkWebSocketConnection };

// Utility to check Kraken proxy status
export const checkKrakenProxyStatus = async (): Promise<boolean> => {
  try {
    const response = await fetch('/kraken-proxy?health=check', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error('Kraken proxy health check failed with status:', response.status);
      return false;
    }
    
    const data = await response.json();
    console.log('Kraken proxy health check result:', data);
    
    return data.status === 'ok';
  } catch (error) {
    console.error('Failed to check Kraken proxy health:', error);
    return false;
  }
};

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
