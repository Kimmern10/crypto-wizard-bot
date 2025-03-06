
import { WebSocketMessage as WebSocketMessageType, ConnectionStatusData } from '@/types/websocketTypes';
import { WebSocketConnection } from '../WebSocketConnection';
import { WebSocketDemoMode } from '../WebSocketDemoMode';
import { WebSocketHeartbeat } from '../WebSocketHeartbeat';
import { WebSocketSubscriptions } from '../WebSocketSubscriptions';
import { WebSocketMessageHandler } from '../WebSocketMessageHandler';
import { WebSocketReconnection } from '../WebSocketReconnection';

/**
 * Core WebSocket management class that delegates responsibilities
 * to specialized modules for better maintainability
 */
export class WebSocketManager {
  private url: string;
  
  // Component managers
  private connection: WebSocketConnection;
  private demoMode: WebSocketDemoMode;
  private heartbeat: WebSocketHeartbeat;
  private subscriptions: WebSocketSubscriptions;
  private messageHandler: WebSocketMessageHandler;
  private reconnection: WebSocketReconnection;
  private reconnectOnVisibilityChange: boolean = true;
  private tabVisibilityListener: ((event: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    this.connection = new WebSocketConnection(url);
    this.demoMode = new WebSocketDemoMode();
    this.heartbeat = new WebSocketHeartbeat();
    this.subscriptions = new WebSocketSubscriptions();
    this.messageHandler = new WebSocketMessageHandler();
    this.reconnection = new WebSocketReconnection();
    
    // Set up message handling
    this.connection.setOnMessage((rawData) => {
      this.heartbeat.updateLastMessageTimestamp();
      this.messageHandler.processWebSocketMessage(rawData, 'ticker');
    });
    
    // Set up notification handlers
    this.demoMode.setNotifyHandler((message) => this.messageHandler.notify(message));
    this.reconnection.setNotifyHandler((message) => this.messageHandler.notify(message));
    
    // Set up visibility change listener
    this.setupVisibilityChangeListener();
    
    console.log(`WebSocketManager initialized with URL: ${url}`);
  }

  private setupVisibilityChangeListener() {
    if (typeof document !== 'undefined') {
      this.tabVisibilityListener = async () => {
        if (!this.reconnectOnVisibilityChange) return;
        
        if (document.visibilityState === 'visible') {
          console.log('Tab became visible, checking WebSocket connection...');
          if (!this.connection.isConnected() && !this.reconnection.isAttemptingConnection()) {
            console.log('Connection lost while tab was hidden, reconnecting...');
            try {
              await this.connect();
            } catch (error) {
              console.error('Error reconnecting on visibility change:', error);
            }
          }
        }
      };
      
      document.addEventListener('visibilitychange', this.tabVisibilityListener);
    }
  }

  setConnectionAttempts(maxAttempts: number): void {
    this.reconnection.setConnectionAttempts(maxAttempts);
  }

  setForceDemoMode(force: boolean): void {
    this.demoMode.setActive(force, force ? 'CORS restrictions' : '');
    
    if (force) {
      // If forcing demo mode, close any existing connection
      this.disconnect();
    }
  }

  isForceDemoMode(): boolean {
    return this.demoMode.isActive();
  }

  connect(): Promise<void> {
    // If we're in forced demo mode, don't actually try to connect
    if (this.demoMode.isActive()) {
      console.log('WebSocket in forced demo mode, not attempting real connection');
      this.messageHandler.notify({
        type: 'connectionStatus',
        data: { status: 'demoMode', message: 'Operating in demo mode' }
      });
      return Promise.resolve();
    }

    if (this.connection.isConnected()) {
      console.log('WebSocket already connected');
      return Promise.resolve();
    }

    if (this.reconnection.isAttemptingConnection()) {
      console.log('WebSocket connection already in progress');
      return Promise.resolve();
    }

    this.reconnection.setConnecting(true);
    this.reconnection.startConnectionAttempt();
    
    return this.connection.connect()
      .then(() => {
        // Connection successful
        this.reconnection.resetReconnectAttempts();
        this.reconnection.setConnecting(false);
        this.startHeartbeat();
        this.heartbeat.updateLastMessageTimestamp();
        
        this.messageHandler.notify({
          type: 'connectionStatus',
          data: { status: 'connected', message: 'Connected to Kraken WebSocket' } as ConnectionStatusData
        });
        
        // Re-establish any subscriptions that were active before disconnection
        this.resubscribeToActiveChannels();
      })
      .catch((error) => {
        console.error('WebSocket connection failed:', error);
        this.reconnection.setConnecting(false);
        this.reconnection.incrementConnectionFailures();
        
        this.messageHandler.notify({
          type: 'connectionStatus',
          data: { 
            status: 'error', 
            message: 'WebSocket connection error' 
          } as ConnectionStatusData
        });
        
        throw error;
      });
  }

  private resubscribeToActiveChannels(): void {
    const activeSubscriptions = this.subscriptions.getActiveSubscriptions();
    
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

  notifySubscribers(message: WebSocketMessageType): void {
    this.messageHandler.notify(message);
  }

  private attemptReconnect() {
    if (this.demoMode.isActive()) {
      console.log('In demo mode, not attempting reconnection');
      return;
    }
    
    if (this.reconnection.hasReachedMaxAttempts()) {
      console.log('Maximum reconnection attempts reached');
      this.reconnection.notifyMaxAttemptsReached();
      
      // Only force demo mode after persistent connection failures
      if (this.reconnection.getConnectionFailures() > 10) {
        console.log('Persistent connection failures detected, switching to demo mode');
        this.setForceDemoMode(true);
      }
      
      return;
    }

    const timeout = this.reconnection.calculateReconnectTimeout();
    console.log(`Attempting to reconnect in ${timeout}ms...`);
    
    this.reconnection.notifyReconnecting();

    setTimeout(() => {
      this.reconnection.incrementReconnectAttempts();
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, timeout);
  }

  private startHeartbeat() {
    this.heartbeat.startHeartbeat(
      () => this.isConnected(),
      () => this.send({ event: 'ping' }),
      () => this.reconnect()
    );
  }

  private reconnect() {
    if (this.demoMode.isActive()) {
      return;
    }
    
    this.disconnect();
    
    this.connect().catch(error => {
      console.error('Reconnection failed:', error);
    });
  }

  subscribe(handler: (message: WebSocketMessageType) => void): () => void {
    return this.messageHandler.addHandler(handler);
  }

  send(message: any): boolean {
    if (this.demoMode.isActive()) {
      console.log('In demo mode, not sending actual message:', message);
      
      // For subscriptions in demo mode, track them anyway
      if (message.event === 'subscribe' && message.pair) {
        const pairs = Array.isArray(message.pair) ? message.pair : [message.pair];
        pairs.forEach(pair => this.subscriptions.addSubscription(pair));
      } else if (message.event === 'unsubscribe' && message.pair) {
        const pairs = Array.isArray(message.pair) ? message.pair : [message.pair];
        pairs.forEach(pair => this.subscriptions.removeSubscription(pair));
      }
      
      // Process fake subscription status messages for demo mode
      this.demoMode.processFakeSubscription(message);
      
      return true;
    }
    
    return this.connection.send(message);
  }

  disconnect() {
    this.heartbeat.stopHeartbeat();
    this.connection.disconnect();
  }

  isConnected(): boolean {
    if (this.demoMode.isActive()) {
      return true; // Always report as connected in demo mode
    }
    return this.connection.isConnected();
  }
  
  getActiveSubscriptions(): string[] {
    return this.subscriptions.getActiveSubscriptions();
  }
  
  clearSubscriptionCache(): void {
    this.subscriptions.clearMessageDebounce();
  }

  // Clean up all event listeners
  cleanup(): void {
    // Remove visibility change listener
    if (typeof document !== 'undefined' && this.tabVisibilityListener) {
      document.removeEventListener('visibilitychange', this.tabVisibilityListener);
      this.tabVisibilityListener = null;
    }
    
    // Disconnect the WebSocket
    this.disconnect();
  }
}
