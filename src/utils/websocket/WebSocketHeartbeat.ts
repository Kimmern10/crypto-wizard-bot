
export class WebSocketHeartbeat {
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastMessageTimestamp = 0;
  
  constructor() {
    console.log('WebSocketHeartbeat initialized');
  }
  
  updateLastMessageTimestamp(): void {
    this.lastMessageTimestamp = Date.now();
  }
  
  getLastMessageTimestamp(): number {
    return this.lastMessageTimestamp;
  }
  
  startHeartbeat(
    isConnectedFn: () => boolean,
    sendPingFn: () => void,
    reconnectFn: () => void,
    interval: number = 30000
  ): void {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      if (isConnectedFn()) {
        // Check if we haven't received any message for more than 45 seconds
        const currentTime = Date.now();
        if (currentTime - this.lastMessageTimestamp > 45000) {
          console.warn('No WebSocket messages received for 45+ seconds, reconnecting...');
          reconnectFn();
          return;
        }
        
        // Send a ping message
        sendPingFn();
        console.log('Sending heartbeat ping to WebSocket');
      } else {
        reconnectFn();
      }
    }, interval);
  }
  
  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}
