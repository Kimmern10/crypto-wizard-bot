
import { WebSocketMessage, ConnectionStatusData } from '@/types/websocketTypes';

export class ConnectionManager {
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout = 1000; // Starting reconnect timeout in ms
  private isConnecting = false;
  private connectionAttemptStarted = 0;
  private connectionFailures = 0;

  constructor() {
    console.log('ConnectionManager initialized');
  }

  setConnectionAttempts(maxAttempts: number): void {
    this.maxReconnectAttempts = maxAttempts;
  }

  resetReconnectAttempts(): void {
    this.reconnectAttempts = 0;
    this.connectionFailures = 0;
  }

  incrementConnectionFailures(): void {
    this.connectionFailures++;
  }

  getConnectionFailures(): number {
    return this.connectionFailures;
  }

  isAttemptingConnection(): boolean {
    return this.isConnecting;
  }

  setConnecting(isConnecting: boolean): void {
    this.isConnecting = isConnecting;
  }

  startConnectionAttempt(): number {
    this.connectionAttemptStarted = Date.now();
    return this.connectionAttemptStarted;
  }

  getConnectionAttemptStartTime(): number {
    return this.connectionAttemptStarted;
  }

  calculateReconnectTimeout(): number {
    return this.reconnectTimeout * Math.pow(1.5, this.reconnectAttempts);
  }

  incrementReconnectAttempts(): void {
    this.reconnectAttempts++;
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  getMaxReconnectAttempts(): number {
    return this.maxReconnectAttempts;
  }

  hasReachedMaxAttempts(): boolean {
    return this.reconnectAttempts >= this.maxReconnectAttempts;
  }
}
