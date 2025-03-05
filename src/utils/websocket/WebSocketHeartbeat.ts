
/**
 * WebSocketHeartbeat manages ping/pong heartbeat detection for WebSocket connections
 * to detect stale connections and trigger reconnects when needed.
 */
export class WebSocketHeartbeat {
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastMessageTimestamp = 0;
  private readonly maxSilenceInterval: number;
  
  /**
   * Creates a new WebSocketHeartbeat instance
   * @param maxSilenceInterval Maximum time in ms before triggering reconnect (default: 45000)
   */
  constructor(maxSilenceInterval: number = 45000) {
    this.maxSilenceInterval = maxSilenceInterval;
    this.lastMessageTimestamp = Date.now();
    console.log('WebSocketHeartbeat initialized');
  }
  
  /**
   * Update the timestamp of the last received message
   */
  updateLastMessageTimestamp(): void {
    this.lastMessageTimestamp = Date.now();
  }
  
  /**
   * Get the timestamp of the last received message
   */
  getLastMessageTimestamp(): number {
    return this.lastMessageTimestamp;
  }
  
  /**
   * Start the heartbeat detection mechanism
   * @param isConnectedFn Function that returns connection status
   * @param sendPingFn Function that sends ping message
   * @param reconnectFn Function to call for reconnection
   * @param interval Heartbeat check interval in ms (default: 30000)
   */
  startHeartbeat(
    isConnectedFn: () => boolean,
    sendPingFn: () => void,
    reconnectFn: () => void,
    interval: number = 30000
  ): void {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      if (isConnectedFn()) {
        // Check if we haven't received any message for more than the maximum silence interval
        const currentTime = Date.now();
        if (currentTime - this.lastMessageTimestamp > this.maxSilenceInterval) {
          console.warn(`No WebSocket messages received for ${this.maxSilenceInterval/1000}+ seconds, reconnecting...`);
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
  
  /**
   * Stop the heartbeat detection mechanism
   */
  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}
