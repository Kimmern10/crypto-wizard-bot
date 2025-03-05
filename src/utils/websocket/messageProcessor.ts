
import { WebSocketMessage } from '@/types/websocketTypes';

export class MessageProcessor {
  private messageHandlers: ((message: WebSocketMessage) => void)[] = [];
  
  constructor() {
    console.log('MessageProcessor initialized');
  }
  
  addMessageHandler(handler: (message: WebSocketMessage) => void): () => void {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    };
  }
  
  notifyHandlers(message: WebSocketMessage): void {
    this.messageHandlers.forEach(handler => handler(message));
  }
  
  processWebSocketMessage(rawData: any, subscriptionName: string): void {
    // Print raw message for debugging (selectively)
    if (typeof rawData === 'object') {
      if (!Array.isArray(rawData) && rawData.event && rawData.event !== 'heartbeat' && rawData.event !== 'pong') {
        console.log('Received WebSocket message:', JSON.stringify(rawData).substring(0, 200));
      }
      
      // Process heartbeat responses
      if (rawData.event === 'pong') {
        console.log('Received WebSocket pong');
        const message: WebSocketMessage = {
          type: 'pong',
          data: { time: new Date() }
        };
        this.notifyHandlers(message);
        return;
      }
    }
    
    // Determine message type and format
    if (Array.isArray(rawData)) {
      // Ticker data from Kraken has this format
      if (rawData.length >= 2 && typeof rawData[1] === 'object' && rawData[1].c) {
        const pairName = rawData[3];
        const tickerData = rawData[1];
        
        // Validate ticker data
        if (!pairName || !tickerData.c || !Array.isArray(tickerData.c) || !tickerData.c[0]) {
          console.warn('Received invalid ticker data format:', rawData);
          return;
        }
        
        const message: WebSocketMessage = {
          type: subscriptionName || 'ticker',
          data: {
            pair: pairName,
            ...tickerData,
            timestamp: new Date().toISOString()
          }
        };
        
        this.notifyHandlers(message);
      }
    } else if (typeof rawData === 'object') {
      // Handle subscription status messages
      if (rawData.event === 'subscriptionStatus') {
        const message: WebSocketMessage = {
          type: 'subscriptionStatus',
          data: rawData
        };
        this.notifyHandlers(message);
      }
      // System status or other types
      else if (rawData.event === 'heartbeat') {
        const message: WebSocketMessage = {
          type: 'heartbeat',
          data: { time: new Date() }
        };
        this.notifyHandlers(message);
      } else if (rawData.event === 'systemStatus') {
        const message: WebSocketMessage = {
          type: 'systemStatus',
          data: {
            connectionID: rawData.connectionID,
            status: rawData.status,
            version: rawData.version
          }
        };
        this.notifyHandlers(message);
      } else if (rawData.event === 'error') {
        console.error('WebSocket error event:', rawData);
        const message: WebSocketMessage = {
          type: 'error',
          data: rawData
        };
        this.notifyHandlers(message);
      } else {
        // Generic event
        const message: WebSocketMessage = {
          type: rawData.event || 'unknown',
          data: rawData
        };
        this.notifyHandlers(message);
      }
    }
  }
}
