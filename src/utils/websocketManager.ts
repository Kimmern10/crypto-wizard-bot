
// Re-export the WebSocketCore and getKrakenWebSocket from new modular structure
import { WebSocketCore } from './websocket/websocketCore';
import { getKrakenWebSocket } from './websocket/krakenWebSocketManager';
import { WebSocketMessage } from '@/types/websocketTypes';

export { WebSocketCore, getKrakenWebSocket, WebSocketMessage };
