
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
  private activeSubscriptions: Set<string> = new Set();
  private connectionAttemptStarted = 0;
  private connectionFailures = 0;

  constructor(url: string) {
    this.url = url;
    console.log(`WebSocketCore initialized with URL: ${url}`);
  }

  setConnectionAttempts(maxAttempts: number): void {
    this.maxReconnectAttempts = maxAttempts;
  }

  setForceDemoMode(force: boolean): void {
    this.forceDemoMode = force;
    console.log(`Demo mode ${force ? 'enabled' : 'disabled'}`);
    
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
      console.log('WebSocket already connected or connecting');
      return Promise.resolve();
    }

    if (this.isConnecting) {
      console.log('WebSocket connection already in progress');
      return Promise.resolve();
    }

    this.isConnecting = true;
    this.connectionAttemptStarted = Date.now();
    
    return new Promise((resolve, reject) => {
      try {
        console.log(`Connecting to WebSocket at ${this.url}`);
        this.socket = new WebSocket(this.url);

        // Set a connection timeout
        const connectionTimeout = setTimeout(() => {
          if (this.isConnecting) {
            console.error('WebSocket connection attempt timed out');
            this.isConnecting = false;
            this.connectionFailures++;
            
            if (this.socket) {
              // Force close the socket if it's still trying to connect
              try {
                this.socket.close();
                this.socket = null;
              } catch (e) {
                console.error('Error closing timed out socket:', e);
              }
            }
            
            reject(new Error('Connection timeout'));
          }
        }, 15000); // 15 second timeout
        
        this.socket.onopen = () => {
          console.log('WebSocket connection established to', this.url);
          clearTimeout(connectionTimeout);
          this.reconnectAttempts = 0;
          this.connectionFailures = 0;
          this.isConnecting = false;
          this.startHeartbeat();
          this.lastMessageTimestamp = Date.now();
          
          this.notifySubscribers({
            type: 'connectionStatus',
            data: { status: 'connected', message: 'Connected to Kraken WebSocket' } as ConnectionStatusData
          });
          
          // Re-establish any subscriptions that were active before disconnection
          this.resubscribeToActiveChannels();
          
          resolve();
        };

        this.socket.onmessage = (event) => {
          this.lastMessageTimestamp = Date.now();
          try {
            // Parse raw data
            const rawData = JSON.parse(event.data);
            this.processWebSocketMessage(rawData);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error, event.data);
          }
        };

        this.socket.onclose = (event) => {
          clearTimeout(connectionTimeout);
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
          
          // Only attempt reconnect if this wasn't a manual disconnect
          const timeSinceStart = Date.now() - this.connectionAttemptStarted;
          if (timeSinceStart > 500) { // Only reconnect if the connection was open for a while
            this.attemptReconnect();
          }
        };

        this.socket.onerror = (error) => {
          clearTimeout(connectionTimeout);
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          this.connectionFailures++;
          
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
        console.error('Error creating WebSocket:', error);
        this.isConnecting = false;
        this.connectionFailures++;
        reject(error);
      }
    });
  }

  // Process WebSocket messages based on their format
  private processWebSocketMessage(rawData: any): void {
    // Print raw message for debugging
    if (typeof rawData === 'object') {
      if (!Array.isArray(rawData) && rawData.event && rawData.event !== 'heartbeat' && rawData.event !== 'pong') {
        console.log('Received WebSocket message:', JSON.stringify(rawData).substring(0, 200));
      }
      
      // Process heartbeat responses
      if (rawData.event === 'pong') {
        console.log('Received WebSocket message:', JSON.stringify(rawData));
        const message: WebSocketMessage = {
          type: 'pong',
          data: { time: new Date() }
        };
        this.messageHandlers.forEach(handler => handler(message));
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
          type: 'ticker',
          data: {
            pair: pairName,
            ...tickerData,
            timestamp: new Date().toISOString()
          }
        };
        
        this.messageHandlers.forEach(handler => handler(message));
      }
    } else if (typeof rawData === 'object') {
      // Handle subscription status messages
      if (rawData.event === 'subscriptionStatus') {
        if (rawData.status === 'subscribed' && rawData.pair) {
          // Add to active subscriptions
          if (Array.isArray(rawData.pair)) {
            rawData.pair.forEach((pair: string) => {
              this.activeSubscriptions.add(pair);
            });
          } else {
            this.activeSubscriptions.add(rawData.pair);
          }
          
          console.log('Successfully subscribed to:', rawData.pair);
          
          const message: WebSocketMessage = {
            type: 'subscriptionStatus',
            data: rawData
          };
          this.messageHandlers.forEach(handler => handler(message));
        } else if (rawData.status === 'unsubscribed' && rawData.pair) {
          // Remove from active subscriptions
          if (Array.isArray(rawData.pair)) {
            rawData.pair.forEach((pair: string) => {
              this.activeSubscriptions.delete(pair);
            });
          } else {
            this.activeSubscriptions.delete(rawData.pair);
          }
          
          console.log('Successfully unsubscribed from:', rawData.pair);
          
          const message: WebSocketMessage = {
            type: 'subscriptionStatus',
            data: rawData
          };
          this.messageHandlers.forEach(handler => handler(message));
        } else if (rawData.status === 'error') {
          console.error('Subscription error:', rawData.errorMessage);
          const message: WebSocketMessage = {
            type: 'error',
            data: rawData
          };
          this.messageHandlers.forEach(handler => handler(message));
        }
      }
      // System status or other types
      else if (rawData.event === 'heartbeat') {
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

  // Resubscribe to channels that were active before connection loss
  private resubscribeToActiveChannels(): void {
    if (this.activeSubscriptions.size > 0) {
      console.log('Resubscribing to active channels:', Array.from(this.activeSubscriptions));
      
      // Resubscribe to each ticker with a small delay
      Array.from(this.activeSubscriptions).forEach((pair, index) => {
        setTimeout(() => {
          // Using correct Kraken WebSocket API subscription format
          this.send({
            event: "subscribe",
            pair: [pair],
            subscription: {
              name: "ticker"
            }
          });
        }, index * 300); // 300ms delay between subscriptions
      });
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
      
      // Only force demo mode after persistent connection failures
      if (this.connectionFailures > 10) {
        console.log('Persistent connection failures detected, switching to demo mode');
        this.setForceDemoMode(true);
      }
      
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
        this.send({ event: 'ping' });
        console.log('Sending heartbeat ping to Kraken WebSocket');
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
      
      // For subscriptions in demo mode, track them anyway
      if (message.event === 'subscribe' && message.pair) {
        const pairs = Array.isArray(message.pair) ? message.pair : [message.pair];
        pairs.forEach(pair => this.activeSubscriptions.add(pair));
        
        // Notify about subscription status even in demo mode
        setTimeout(() => {
          this.notifySubscribers({
            type: 'subscriptionStatus',
            data: {
              event: 'subscriptionStatus',
              status: 'subscribed',
              pair: message.pair,
              subscription: { name: message.subscription?.name }
            }
          });
        }, 500);
      } else if (message.event === 'unsubscribe' && message.pair) {
        const pairs = Array.isArray(message.pair) ? message.pair : [message.pair];
        pairs.forEach(pair => this.activeSubscriptions.delete(pair));
        
        // Notify about unsubscription status even in demo mode
        setTimeout(() => {
          this.notifySubscribers({
            type: 'subscriptionStatus',
            data: {
              event: 'subscriptionStatus',
              status: 'unsubscribed',
              pair: message.pair,
              subscription: { name: message.subscription?.name }
            }
          });
        }, 500);
      }
      
      return true;
    }
    
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('Cannot send message: WebSocket is not open');
      return false;
    }

    try {
      const messageStr = JSON.stringify(message);
      console.log('Sending WebSocket message:', messageStr);
      this.socket.send(messageStr);
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
  
  getActiveSubscriptions(): string[] {
    return Array.from(this.activeSubscriptions);
  }
}
