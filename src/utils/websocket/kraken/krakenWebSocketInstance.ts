
import { WebSocketManager } from '../core/WebSocketManager';
import { getKrakenWebSocketManager } from '../websocketInstanceFactory';

/**
 * Get the shared Kraken WebSocket instance
 * @returns WebSocketManager instance for Kraken
 */
export const getKrakenWebSocket = (): WebSocketManager => {
  return getKrakenWebSocketManager();
};

/**
 * Get the overall connection status for Kraken WebSocket
 * @returns Object with connection status details
 */
export const getConnectionStatus = (): {isConnected: boolean, isDemoMode: boolean} => {
  const ws = getKrakenWebSocket();
  return {
    isConnected: ws.isConnected(),
    isDemoMode: ws.isForceDemoMode()
  };
};
