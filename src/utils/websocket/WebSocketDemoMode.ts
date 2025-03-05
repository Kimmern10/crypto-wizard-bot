
import { WebSocketMessage } from '@/types/websocketTypes';

export class WebSocketDemoMode {
  private active = false;
  private reason = '';
  private notifyHandlers: ((message: WebSocketMessage) => void) | null = null;
  
  constructor() {
    console.log('WebSocketDemoMode initialized');
  }
  
  setActive(active: boolean, reason: string = ''): void {
    this.active = active;
    if (reason) {
      this.reason = reason;
    }
    
    if (active && this.notifyHandlers) {
      this.notifyHandlers({
        type: 'modeChange',
        data: { isDemoMode: true, reason: this.reason || 'Unknown reason' }
      });
    }
    
    console.log(`Demo mode ${active ? 'enabled' : 'disabled'}${reason ? ` (${reason})` : ''}`);
  }
  
  isActive(): boolean {
    return this.active;
  }
  
  getReason(): string {
    return this.reason;
  }
  
  setNotifyHandler(handler: (message: WebSocketMessage) => void): void {
    this.notifyHandlers = handler;
  }
  
  processFakeSubscription(message: any): void {
    if (!this.active || !this.notifyHandlers) {
      return;
    }
    
    // For demo mode subscriptions, simulate subscription response
    if (message.event === 'subscribe' && message.pair) {
      setTimeout(() => {
        if (this.notifyHandlers) {
          this.notifyHandlers({
            type: 'subscriptionStatus',
            data: {
              event: 'subscriptionStatus',
              status: 'subscribed',
              pair: message.pair,
              subscription: { name: message.subscription?.name }
            }
          });
        }
      }, 500);
    } else if (message.event === 'unsubscribe' && message.pair) {
      setTimeout(() => {
        if (this.notifyHandlers) {
          this.notifyHandlers({
            type: 'subscriptionStatus',
            data: {
              event: 'subscriptionStatus',
              status: 'unsubscribed',
              pair: message.pair,
              subscription: { name: message.subscription?.name }
            }
          });
        }
      }, 500);
    }
  }
}
