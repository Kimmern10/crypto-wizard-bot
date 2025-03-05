import { WebSocketMessage, ConnectionStatusData } from '@/types/websocketTypes';

declare global {
  interface Window {
    botInterval: NodeJS.Timeout;
  }
}

export class WebSocketCore {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout = 1000; // Starting reconnect timeout in ms
  private messageHandlers: ((message: WebSocketMessage) => void)[] = [];
  private url: string;
  private isConnecting = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastMessageTimestamp = 0;
  private forceDemoMode = false;

  constructor(url: string) {
    this.url = url;
  }

  setForceDemoMode(force: boolean): void {
    this.forceDemoMode = force;
    if (force) {
      // If forcing demo mode, close any existing connection
      this.disconnect();
      // Notify subscribers about the mode change
      this.notifySubscribers({
        type: 'modeChange',
        data: { isDemoMode: true, reason: 'CORS restrictions' }
      });
    }
  }

  isForceDemoMode(): boolean {
    return this.forceDemoMode;
  }

  connect(): Promise<void> {
    // If we're in forced demo mode, don't actually try to connect
    if (this.forceDemoMode) {
      console.log('WebSocket in forced demo mode, not attempting real connection');
      this.notifySubscribers({
        type: 'connectionStatus',
        data: { status: 'demoMode', message: 'Operating in demo mode' }
      });
      return Promise.resolve();
    }

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
          this.startHeartbeat();
          this.lastMessageTimestamp = Date.now();
          
          this.notifySubscribers({
            type: 'connectionStatus',
            data: { status: 'connected', message: 'Connected to Kraken WebSocket' } as ConnectionStatusData
          });
          
          resolve();
        };

        this.socket.onmessage = (event) => {
          this.lastMessageTimestamp = Date.now();
          try {
            // Parse raw data
            const rawData = JSON.parse(event.data);
            this.processWebSocketMessage(rawData);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.socket.onclose = (event) => {
          console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
          this.stopHeartbeat();
          this.socket = null;
          this.isConnecting = false;
          
          this.notifySubscribers({
            type: 'connectionStatus',
            data: { 
              status: 'disconnected', 
              message: `Connection closed: ${event.code} ${event.reason}` 
            } as ConnectionStatusData
          });
          
          this.attemptReconnect();
        };

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          
          this.notifySubscribers({
            type: 'connectionStatus',
            data: { 
              status: 'error', 
              message: 'WebSocket connection error' 
            } as ConnectionStatusData
          });
          
          reject(error);
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  // Process WebSocket messages based on their format
  private processWebSocketMessage(rawData: any): void {
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
      } else if (rawData.event === 'error') {
        console.error('WebSocket error event:', rawData);
        const message: WebSocketMessage = {
          type: 'error',
          data: rawData
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
  }

  notifySubscribers(message: WebSocketMessage): void {
    this.messageHandlers.forEach(handler => handler(message));
  }

  private attemptReconnect() {
    if (this.forceDemoMode) {
      console.log('In demo mode, not attempting reconnection');
      return;
    }
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Maximum reconnection attempts reached');
      
      this.notifySubscribers({
        type: 'connectionStatus',
        data: { 
          status: 'failed', 
          message: 'Maximum reconnection attempts reached' 
        } as ConnectionStatusData
      });
      
      return;
    }

    const timeout = this.reconnectTimeout * Math.pow(1.5, this.reconnectAttempts);
    console.log(`Attempting to reconnect in ${timeout}ms...`);
    
    this.notifySubscribers({
      type: 'connectionStatus',
      data: { 
        status: 'reconnecting', 
        message: `Reconnecting in ${Math.round(timeout/1000)}s (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})` 
      } as ConnectionStatusData
    });

    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, timeout);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    
    // Send a ping every 30 seconds to keep the connection alive
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        // Check if we haven't received any message for more than 45 seconds
        const currentTime = Date.now();
        if (currentTime - this.lastMessageTimestamp > 45000) {
          console.warn('No WebSocket messages received for 45+ seconds, reconnecting...');
          this.reconnect();
          return;
        }
        
        // Send a ping message to Kraken
        this.send({ op: 'ping' });
      } else {
        this.reconnect();
      }
    }, 30000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private reconnect() {
    if (this.forceDemoMode) {
      return;
    }
    
    if (this.socket) {
      try {
        this.socket.close();
      } catch (error) {
        console.error('Error closing WebSocket during reconnect:', error);
      }
      this.socket = null;
    }
    
    this.connect().catch(error => {
      console.error('Reconnection failed:', error);
    });
  }

  subscribe(handler: (message: WebSocketMessage) => void): () => void {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    };
  }

  send(message: any): boolean {
    if (this.forceDemoMode) {
      console.log('In demo mode, not sending actual message:', message);
      return true;
    }
    
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
    this.stopHeartbeat();
    if (this.socket) {
      try {
        this.socket.close();
        this.socket = null;
      } catch (error) {
        console.error('Error disconnecting WebSocket:', error);
        this.socket = null;
      }
    }
  }

  isConnected(): boolean {
    if (this.forceDemoMode) {
      return true; // Always report as connected in demo mode
    }
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }
}
