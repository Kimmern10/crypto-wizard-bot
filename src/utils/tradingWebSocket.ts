
// Re-export the setupWebSocket function from the new modular structure
import { setupWebSocket } from './websocket/tradingWebSocketSetup';
import { checkWebSocketConnection } from './websocket/connectionUtils';

export { setupWebSocket, checkWebSocketConnection };
