
export interface WebSocketMessage {
  type: string;
  data: any;
}

export interface TickerData {
  pair: string;
  c: string[];  // Last trade closed price
  v: string[];  // Volume
  p: string[];  // Price
  t: string[];  // Number of trades
  l: string[];  // Low price
  h: string[];  // High price
  o: string[];  // Open price
  timestamp: string;
}

export interface ConnectionStatusData {
  status: string;
  message: string;
}

export interface WebSocketConfig {
  url: string;
  reconnectAttempts?: number;
  reconnectTimeout?: number;
  heartbeatInterval?: number;
}
