
import { WebSocketMessage as WebSocketMessageType } from '@/types/websocketTypes';

export class WebSocketMessageHandler {
  private handlers: ((message: WebSocketMessageType) => void)[] = [];
  
  constructor() {
    console.log('WebSocketMessageHandler initialized');
  }
  
  addHandler(handler: (message: WebSocketMessageType) => void): () => void {
    this.handlers.push(handler);
    
    // Return a function to remove this handler
    return () => {
      this.handlers = this.handlers.filter(h => h !== handler);
    };
  }
  
  notify(message: WebSocketMessageType): void {
    this.handlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error('Error in WebSocket message handler:', error);
      }
    });
  }
  
  processWebSocketMessage(rawData: any, defaultType: string = 'unknown'): void {
    try {
      if (Array.isArray(rawData) && rawData.length > 1 && rawData[1]) {
        // Handle ticker data format: [channelID, data, channelName, pair]
        if (rawData.length >= 4 && typeof rawData[3] === 'string') {
          const tickerPair = rawData[3];
          const tickerData = {
            pair: tickerPair,
            ...rawData[1],
            timestamp: new Date().toISOString()
          };
          
          this.notify({
            type: defaultType,
            data: tickerData
          });
        }
      } else if (typeof rawData === 'object') {
        if (rawData.event === 'heartbeat') {
          this.notify({
            type: 'heartbeat',
            data: { timestamp: new Date().toISOString() }
          });
        } else if (rawData.event === 'pong') {
          this.notify({
            type: 'pong',
            data: { timestamp: new Date().toISOString() }
          });
        } else if (rawData.event === 'systemStatus') {
          this.notify({
            type: 'systemStatus',
            data: rawData
          });
        } else if (rawData.event === 'subscriptionStatus') {
          this.notify({
            type: 'subscriptionStatus',
            data: rawData
          });
        } else if (rawData.event === 'error') {
          this.notify({
            type: 'error',
            data: rawData
          });
        } else {
          console.log('Unhandled websocket message format:', rawData);
          this.notify({
            type: 'unknown',
            data: rawData
          });
        }
      } else {
        console.log('Unknown websocket message format:', rawData);
        this.notify({
          type: 'unknown',
          data: rawData
        });
      }
    } catch (error) {
      console.error('Error processing websocket message:', error, rawData);
    }
  }
}
