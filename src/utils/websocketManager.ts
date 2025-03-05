
// Re-export the WebSocketCore and getKrakenWebSocket from new modular structure
import { WebSocketCore } from './websocket/websocketCore';
import { getKrakenWebSocket, subscribeToTickers, getConnectionStatus } from './websocket/krakenWebSocketManager';
import type { WebSocketMessage } from '@/types/websocketTypes';

// Export a function to initialize the WebSocket connection
export const initializeWebSocket = () => {
  const ws = getKrakenWebSocket();
  
  // Try to connect immediately
  ws.connect().catch(error => {
    console.error('Failed to initialize WebSocket connection:', error);
  });
  
  return ws;
};

// Add a utility function to check WebSocket status
export const checkWebSocketStatus = () => {
  const ws = getKrakenWebSocket();
  return {
    isConnected: ws.isConnected(),
    isDemoMode: ws.isForceDemoMode(),
    activeSubscriptions: ws.getActiveSubscriptions()
  };
};

export { 
  WebSocketCore, 
  getKrakenWebSocket, 
  subscribeToTickers, 
  getConnectionStatus,
  type WebSocketMessage 
};
