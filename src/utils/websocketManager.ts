
// Re-export the WebSocketCore and getKrakenWebSocket from new modular structure
import { WebSocketCore } from './websocket/websocketCore';
import { getKrakenWebSocket, subscribeToTickers, getConnectionStatus } from './websocket/krakenWebSocketManager';
import type { WebSocketMessage } from '@/types/websocketTypes';

// Track initialization status
let isInitialized = false;

// Export a function to initialize the WebSocket connection
export const initializeWebSocket = () => {
  // Prevent multiple initialization
  if (isInitialized) {
    console.log('WebSocket already initialized, reusing existing connection');
    return getKrakenWebSocket();
  }
  
  console.log('Initializing WebSocket connection...');
  const ws = getKrakenWebSocket();
  
  // Try to connect immediately
  ws.connect().catch(error => {
    console.error('Failed to initialize WebSocket connection:', error);
    // Don't enable demo mode here - let the connection utils handle that decision
  });
  
  isInitialized = true;
  return ws;
};

// Function to restart the WebSocket connection
export const restartWebSocket = () => {
  const ws = getKrakenWebSocket();
  
  // First disconnect if connected
  if (ws.isConnected()) {
    ws.disconnect();
  }
  
  // Clear demo mode
  ws.setForceDemoMode(false);
  
  // Try to reconnect
  return ws.connect().catch(error => {
    console.error('Failed to restart WebSocket connection:', error);
  });
};

// Add a utility function to check WebSocket status
export const checkWebSocketStatus = () => {
  const ws = getKrakenWebSocket();
  return {
    isConnected: ws.isConnected(),
    isDemoMode: ws.isForceDemoMode(),
    activeSubscriptions: ws.getActiveSubscriptions(),
    isInitialized
  };
};

export { 
  WebSocketCore, 
  getKrakenWebSocket, 
  subscribeToTickers, 
  getConnectionStatus,
  type WebSocketMessage 
};
