
export interface WebSocketMessage {
  type: string;
  data: any;
}

declare global {
  interface Window {
    botInterval: NodeJS.Timeout;
  }
}

export class WebSocketManager {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout = 1000; // Starting reconnect timeout in ms
  private messageHandlers: ((message: WebSocketMessage) => void)[] = [];
  private url: string;
  private isConnecting = false;

  constructor(url: string) {
    this.url = url;
  }

  connect(): Promise<void> {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return Promise.resolve();
    }

    if (this.isConnecting) {
      return Promise.resolve();
    }

    this.isConnecting = true;
    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(this.url);

        this.socket.onopen = () => {
          console.log('WebSocket connection established to', this.url);
          this.reconnectAttempts = 0;
          this.isConnecting = false;
          resolve();
        };

        this.socket.onmessage = (event) => {
          try {
            // Kraken's WebSocket messages can be arrays or objects
            const rawData = JSON.parse(event.data);
            
            // Determine message type and format
            if (Array.isArray(rawData)) {
              // Ticker data from Kraken has this format
              if (rawData.length >= 2 && typeof rawData[1] === 'object' && rawData[1].c) {
                const pairName = rawData[3];
                const tickerData = rawData[1];
                
                const message: WebSocketMessage = {
                  type: 'ticker',
                  data: {
                    pair: pairName,
                    ...tickerData
                  }
                };
                
                this.messageHandlers.forEach(handler => handler(message));
              }
            } else if (typeof rawData === 'object') {
              // System status or other types
              if (rawData.event === 'heartbeat') {
                const message: WebSocketMessage = {
                  type: 'heartbeat',
                  data: { time: new Date() }
                };
                this.messageHandlers.forEach(handler => handler(message));
              } else if (rawData.event === 'systemStatus') {
                const message: WebSocketMessage = {
                  type: 'systemStatus',
                  data: {
                    connectionID: rawData.connectionID,
                    status: rawData.status,
                    version: rawData.version
                  }
                };
                this.messageHandlers.forEach(handler => handler(message));
              } else {
                // Generic event
                const message: WebSocketMessage = {
                  type: rawData.event || 'unknown',
                  data: rawData
                };
                this.messageHandlers.forEach(handler => handler(message));
              }
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.socket.onclose = (event) => {
          console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
          this.socket = null;
          this.isConnecting = false;
          this.attemptReconnect();
        };

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          reject(error);
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Maximum reconnection attempts reached');
      return;
    }

    const timeout = this.reconnectTimeout * Math.pow(1.5, this.reconnectAttempts);
    console.log(`Attempting to reconnect in ${timeout}ms...`);

    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, timeout);
  }

  subscribe(handler: (message: WebSocketMessage) => void): () => void {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    };
  }

  send(message: any): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('Cannot send message: WebSocket is not open');
      return false;
    }

    try {
      this.socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }
}

// Singleton instance for Kraken WebSocket
let krakenWsInstance: WebSocketManager | null = null;

export const getKrakenWebSocket = (): WebSocketManager => {
  if (!krakenWsInstance) {
    krakenWsInstance = new WebSocketManager('wss://ws.kraken.com');
  }
  return krakenWsInstance;
};
