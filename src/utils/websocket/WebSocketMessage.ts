
export class WebSocketMessage {
  private static parseRawData(data: any): any {
    try {
      if (typeof data === 'string') {
        return JSON.parse(data);
      }
      return data;
    } catch (error) {
      console.error('Error parsing WebSocket message:', error, data);
      throw error;
    }
  }

  static formatOutgoing(message: any): string {
    try {
      return JSON.stringify(message);
    } catch (error) {
      console.error('Error formatting WebSocket message:', error);
      throw error;
    }
  }

  static isTickerData(data: any): boolean {
    return Array.isArray(data) && data.length > 1 && data[1] && typeof data[1] === 'object';
  }

  static isSubscriptionStatus(data: any): boolean {
    return data && data.event === 'subscriptionStatus';
  }

  static isPong(data: any): boolean {
    return data && data.event === 'pong';
  }

  static isSystemStatus(data: any): boolean {
    return data && data.event === 'systemStatus';
  }

  static isError(data: any): boolean {
    return data && data.event === 'error';
  }
}
