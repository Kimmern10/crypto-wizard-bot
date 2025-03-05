
import { WebSocketCore } from '../websocketCore';

/**
 * Subscribes to ticker data for multiple pairs
 */
export const subscribeToTickers = (wsManager: WebSocketCore, pairs: string[]): void => {
  // Connect first if not connected
  if (!wsManager.isConnected()) {
    console.log('WebSocket not connected, connecting before subscribing...');
    wsManager.connect().catch(err => {
      console.error('Failed to connect WebSocket before subscribing:', err);
    });
  }
  
  // Subscribe to each pair individually with a small delay
  // to avoid overwhelming the WebSocket
  pairs.forEach((pair, index) => {
    setTimeout(() => {
      if (wsManager.isConnected()) {
        console.log(`Subscribing to ${pair} ticker...`);
        // Using correct Kraken WebSocket API subscription format
        wsManager.send({
          event: "subscribe",
          pair: [pair],
          subscription: {
            name: "ticker"
          }
        });
      } else {
        console.warn(`Cannot subscribe to ${pair}: WebSocket not connected`);
      }
    }, index * 300); // 300ms delay between subscriptions
  });
};
