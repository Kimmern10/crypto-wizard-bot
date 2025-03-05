
export class WebSocketSubscriptions {
  private activeSubscriptions: Set<string> = new Set();
  private messageDebounce = new Map<string, number>();
  
  constructor() {
    console.log('WebSocketSubscriptions initialized');
  }
  
  addSubscription(pair: string): void {
    this.activeSubscriptions.add(pair);
  }
  
  removeSubscription(pair: string): void {
    this.activeSubscriptions.delete(pair);
  }
  
  hasSubscription(pair: string): boolean {
    return this.activeSubscriptions.has(pair);
  }
  
  getActiveSubscriptions(): string[] {
    return Array.from(this.activeSubscriptions);
  }
  
  clearSubscriptions(): void {
    this.activeSubscriptions.clear();
  }
  
  shouldDebounceMessage(pairName: string, debounceTime: number = 500): boolean {
    const now = Date.now();
    const lastUpdate = this.messageDebounce.get(pairName);
    
    if (lastUpdate && now - lastUpdate < debounceTime) {
      return true;
    }
    
    this.messageDebounce.set(pairName, now);
    return false;
  }
  
  clearMessageDebounce(): void {
    this.messageDebounce.clear();
  }
}
