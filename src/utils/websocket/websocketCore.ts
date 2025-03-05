
import { WebSocketMessage, ConnectionStatusData } from '@/types/websocketTypes';
import { ConnectionManager } from './connectionManager';
import { SubscriptionManager } from './subscriptionManager';
import { HeartbeatManager } from './heartbeatManager';
import { MessageProcessor } from './messageProcessor';

declare global {
  interface Window {
    botInterval: NodeJS.Timeout;
  }
}

export class WebSocketCore {
  private socket: WebSocket | null = null;
  private url: string;
  private forceDemoMode = false;
  
  // Component managers
  private connectionManager: ConnectionManager;
  private subscriptionManager: SubscriptionManager;
  private heartbeatManager: HeartbeatManager;
  private messageProcessor: MessageProcessor;

  constructor(url: string) {
    this.url = url;
    this.connectionManager = new ConnectionManager();
    this.subscriptionManager = new SubscriptionManager();
    this.heartbeatManager = new HeartbeatManager();
    this.messageProcessor = new MessageProcessor();
    
    console.log(`WebSocketCore initialized with URL: ${url}`);
  }

  setConnectionAttempts(maxAttempts: number): void {
    this.connectionManager.setConnectionAttempts(maxAttempts);
  }

  setForceDemoMode(force: boolean): void {
    this.forceDemoMode = force;
    console.log(`Demo mode ${force ? 'enabled' : 'disabled'}`);
    
    if (force) {
      // If forcing demo mode, close any existing connection
      this.disconnect();
      // Notify subscribers about the mode change
      this.messageProcessor.notifyHandlers({
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
      this.messageProcessor.notifyHandlers({
        type: 'connectionStatus',
        data: { status: 'demoMode', message: 'Operating in demo mode' }
      });
      return Promise.resolve();
    }

    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      console.log('WebSocket already connected or connecting');
      return Promise.resolve();
    }

    if (this.connectionManager.isAttemptingConnection()) {
      console.log('WebSocket connection already in progress');
      return Promise.resolve();
    }

    this.connectionManager.setConnecting(true);
    this.connectionManager.startConnectionAttempt();
    
    return new Promise((resolve, reject) => {
      try {
        console.log(`Connecting to WebSocket at ${this.url}`);
        this.socket = new WebSocket(this.url);

        // Set a connection timeout
        const connectionTimeout = setTimeout(() => {
          if (this.connectionManager.isAttemptingConnection()) {
            console.error('WebSocket connection attempt timed out');
            this.connectionManager.setConnecting(false);
            this.connectionManager.incrementConnectionFailures();
            
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
          this.connectionManager.resetReconnectAttempts();
          this.connectionManager.setConnecting(false);
          this.startHeartbeat();
          this.heartbeatManager.updateLastMessageTimestamp();
          
          this.messageProcessor.notifyHandlers({
            type: 'connectionStatus',
            data: { status: 'connected', message: 'Connected to Kraken WebSocket' } as ConnectionStatusData
          });
          
          // Re-establish any subscriptions that were active before disconnection
          this.resubscribeToActiveChannels();
          
          resolve();
        };

        this.socket.onmessage = (event) => {
          this.heartbeatManager.updateLastMessageTimestamp();
          try {
            // Parse raw data
            const rawData = JSON.parse(event.data);
            this.messageProcessor.processWebSocketMessage(rawData, 'ticker');
          } catch (error) {
            console.error('Error parsing WebSocket message:', error, event.data);
          }
        };

        this.socket.onclose = (event) => {
          clearTimeout(connectionTimeout);
          console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
          this.heartbeatManager.stopHeartbeat();
          this.socket = null;
          this.connectionManager.setConnecting(false);
          
          this.messageProcessor.notifyHandlers({
            type: 'connectionStatus',
            data: { 
              status: 'disconnected', 
              message: `Connection closed: ${event.code} ${event.reason}` 
            } as ConnectionStatusData
          });
          
          // Only attempt reconnect if this wasn't a manual disconnect
          const timeSinceStart = Date.now() - this.connectionManager.getConnectionAttemptStartTime();
          if (timeSinceStart > 500) { // Only reconnect if the connection was open for a while
            this.attemptReconnect();
          }
        };

        this.socket.onerror = (error) => {
          clearTimeout(connectionTimeout);
          console.error('WebSocket error:', error);
          this.connectionManager.setConnecting(false);
          this.connectionManager.incrementConnectionFailures();
          
          this.messageProcessor.notifyHandlers({
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
        this.connectionManager.setConnecting(false);
        this.connectionManager.incrementConnectionFailures();
        reject(error);
      }
    });
  }

  // Process WebSocket messages based on their format with debouncing for high-frequency messages
  private resubscribeToActiveChannels(): void {
    const activeSubscriptions = this.subscriptionManager.getActiveSubscriptions();
    
    if (activeSubscriptions.length > 0) {
      console.log('Resubscribing to active channels:', activeSubscriptions);
      
      // Resubscribe to each ticker with a small delay
      activeSubscriptions.forEach((pair, index) => {
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
    this.messageProcessor.notifyHandlers(message);
  }

  private attemptReconnect() {
    if (this.forceDemoMode) {
      console.log('In demo mode, not attempting reconnection');
      return;
    }
    
    if (this.connectionManager.hasReachedMaxAttempts()) {
      console.log('Maximum reconnection attempts reached');
      
      this.messageProcessor.notifyHandlers({
        type: 'connectionStatus',
        data: { 
          status: 'failed', 
          message: 'Maximum reconnection attempts reached' 
        } as ConnectionStatusData
      });
      
      // Only force demo mode after persistent connection failures
      if (this.connectionManager.getConnectionFailures() > 10) {
        console.log('Persistent connection failures detected, switching to demo mode');
        this.setForceDemoMode(true);
      }
      
      return;
    }

    const timeout = this.connectionManager.calculateReconnectTimeout();
    console.log(`Attempting to reconnect in ${timeout}ms...`);
    
    this.messageProcessor.notifyHandlers({
      type: 'connectionStatus',
      data: { 
        status: 'reconnecting', 
        message: `Reconnecting in ${Math.round(timeout/1000)}s (attempt ${this.connectionManager.getReconnectAttempts() + 1}/${this.connectionManager.getMaxReconnectAttempts()})` 
      } as ConnectionStatusData
    });

    setTimeout(() => {
      this.connectionManager.incrementReconnectAttempts();
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, timeout);
  }

  private startHeartbeat() {
    this.heartbeatManager.startHeartbeat(
      () => this.isConnected(),
      () => this.send({ event: 'ping' }),
      () => this.reconnect()
    );
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
    return this.messageProcessor.addMessageHandler(handler);
  }

  send(message: any): boolean {
    if (this.forceDemoMode) {
      console.log('In demo mode, not sending actual message:', message);
      
      // For subscriptions in demo mode, track them anyway
      if (message.event === 'subscribe' && message.pair) {
        const pairs = Array.isArray(message.pair) ? message.pair : [message.pair];
        pairs.forEach(pair => this.subscriptionManager.addSubscription(pair));
        
        // Notify about subscription status even in demo mode
        setTimeout(() => {
          this.messageProcessor.notifyHandlers({
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
        pairs.forEach(pair => this.subscriptionManager.removeSubscription(pair));
        
        // Notify about unsubscription status even in demo mode
        setTimeout(() => {
          this.messageProcessor.notifyHandlers({
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
    this.heartbeatManager.stopHeartbeat();
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
    return this.subscriptionManager.getActiveSubscriptions();
  }
  
  clearSubscriptionCache(): void {
    this.subscriptionManager.clearMessageDebounce();
  }
}
