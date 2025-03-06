
export class WebSocketConnection {
  private socket: WebSocket | null = null;
  private url: string;
  private onMessageCallback: ((data: any) => void) | null = null;
  private reconnecting = false;
  private closeIntentional = false;
  
  constructor(url: string) {
    this.url = url;
  }
  
  connect(): Promise<void> {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      console.log('WebSocket already connected or connecting');
      return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
      try {
        console.log(`Connecting to WebSocket at ${this.url}`);
        this.closeIntentional = false;
        this.socket = new WebSocket(this.url);
        
        // Set a connection timeout
        const connectionTimeout = setTimeout(() => {
          console.error('WebSocket connection attempt timed out');
          
          if (this.socket) {
            try {
              this.closeIntentional = true;
              this.socket.close();
              this.socket = null;
            } catch (e) {
              console.error('Error closing timed out socket:', e);
            }
          }
          
          reject(new Error('Connection timeout'));
        }, 15000); // 15 second timeout
        
        this.socket.onopen = () => {
          console.log('WebSocket connection established to', this.url);
          clearTimeout(connectionTimeout);
          resolve();
        };
        
        this.socket.onmessage = (event) => {
          try {
            const rawData = JSON.parse(event.data);
            if (this.onMessageCallback) {
              this.onMessageCallback(rawData);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error, event.data);
          }
        };
        
        this.socket.onclose = (event) => {
          clearTimeout(connectionTimeout);
          console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
          
          // Only attempt automatic reconnection if this wasn't an intentional close
          if (!this.closeIntentional && !this.reconnecting) {
            console.log('Connection was closed unexpectedly, will attempt to reconnect');
            this.reconnecting = true;
            
            // Delay slightly before allowing reconnection attempts
            setTimeout(() => {
              this.reconnecting = false;
              this.socket = null;
            }, 100);
          } else {
            this.socket = null;
          }
        };
        
        this.socket.onerror = (error) => {
          clearTimeout(connectionTimeout);
          console.error('WebSocket error:', error);
          
          // Don't reject if we're already closing intentionally
          if (!this.closeIntentional) {
            reject(error);
          }
        };
      } catch (error) {
        console.error('Error creating WebSocket:', error);
        reject(error);
      }
    });
  }
  
  send(message: any): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('Cannot send message: WebSocket is not open');
      return false;
    }
    
    try {
      const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
      console.log('Sending WebSocket message:', messageStr);
      this.socket.send(messageStr);
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }
  
  setOnMessage(callback: (data: any) => void): void {
    this.onMessageCallback = callback;
  }
  
  disconnect(): void {
    if (this.socket) {
      try {
        this.closeIntentional = true;
        this.socket.close();
        this.socket = null;
        console.log('WebSocket disconnected intentionally');
      } catch (error) {
        console.error('Error disconnecting WebSocket:', error);
        this.socket = null;
      }
    }
  }
  
  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }
}
