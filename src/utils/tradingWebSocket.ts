
// Re-export the setupWebSocket function from the new modular structure
import { setupWebSocket } from './websocket/tradingWebSocketSetup';
import { checkWebSocketConnection, checkProxyFunction } from './websocket/connectionUtils';

export { setupWebSocket, checkWebSocketConnection, checkProxyFunction };
