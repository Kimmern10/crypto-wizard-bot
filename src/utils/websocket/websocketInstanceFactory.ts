
import { WebSocketManager } from './core/WebSocketManager';

// Singleton instances for various WebSocket connections
let krakenWsInstance: WebSocketManager | null = null;

/**
 * Factory method to get or create a WebSocket manager instance for Kraken
 */
export const getKrakenWebSocketManager = (): WebSocketManager => {
  if (!krakenWsInstance) {
    krakenWsInstance = new WebSocketManager('wss://ws.kraken.com');
    console.log('Created new Kraken WebSocket manager instance');
  }
  return krakenWsInstance;
};

/**
 * Resets all WebSocket manager instances (for testing)
 */
export const resetWebSocketInstances = (): void => {
  if (krakenWsInstance) {
    krakenWsInstance.disconnect();
    krakenWsInstance = null;
  }
};
