
import { WebSocketCore } from '../websocketCore';

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

// Get the overall connection status
export const getConnectionStatus = (): {isConnected: boolean, isDemoMode: boolean} => {
  const ws = getKrakenWebSocket();
  return {
    isConnected: ws.isConnected(),
    isDemoMode: ws.isForceDemoMode()
  };
};
