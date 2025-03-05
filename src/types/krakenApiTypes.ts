
// Types for Kraken API configurations and parameters
export interface KrakenApiConfig {
  apiKey: string;
  apiSecret: string;
}

// Define strict types for all API parameters
export interface OrderParams {
  pair: string;
  type: 'buy' | 'sell';
  ordertype: 'market' | 'limit';
  volume: string;
  price?: string;
}

// Detailed error response type
export interface KrakenErrorResponse {
  error: string[];
}

// Types for Kraken API responses with proper typing
export interface KrakenTimeResponse {
  error?: string[];
  result: {
    unixtime: number;
    rfc1123: string;
  };
}

export interface KrakenBalanceResponse {
  error?: string[];
  result: Record<string, string>;
}

// Improved position structure with specific fields
export interface KrakenPosition {
  pair: string;
  type: string;
  vol: string;
  vol_closed?: string;
  cost: string;
  fee: string;
  margin: string;
  value: string;
  net: string;
  leverage: string;
  status?: string;
}

export interface KrakenPositionsResponse {
  error?: string[];
  result: Record<string, KrakenPosition>;
}

// Improved trade structure with specific fields
export interface KrakenTrade {
  pair: string;
  type: string;
  ordertype: string;
  price: string;
  vol: string;
  cost: string;
  fee: string;
  time: number;
}

export interface KrakenTradesResponse {
  error?: string[];
  result: {
    trades: Record<string, KrakenTrade>;
    count: number;
  };
}

export interface KrakenOrderResponse {
  error?: string[];
  result: {
    descr: { order: string };
    txid: string[];
  };
}

// Return type for the useKrakenApi hook
export interface KrakenApiResponse {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  errorDetails: ErrorDetails | null;
  data: any;
  connect: () => Promise<void>;
  sendOrder: (params: OrderParams) => Promise<any>;
  fetchBalance: () => Promise<Record<string, number> | null>;
  fetchOpenPositions: () => Promise<Position[] | null>;
  fetchTradeHistory: () => Promise<Trade[] | null>;
  subscribeToTicker: (pair: string) => void;
  unsubscribeFromTicker: (pair: string) => void;
}

// Enhanced error type with more details
export interface ErrorDetails {
  code: string;
  message: string;
  httpStatus?: number;
  timestamp: string;
  endpoint?: string;
}

// Strongly typed processed data models
export interface Position {
  id: string;
  pair: string;
  type: string;
  volume: number;
  cost: number;
  fee: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  leverage: string;
  status?: string;
}

export interface Trade {
  id: string;
  pair: string;
  type: string;
  price: number;
  volume: number;
  time: string;
  orderType: string;
  cost: number;
  fee: number;
}

// API request validation schemas
export interface RequestValidator {
  validate: (data: any) => { valid: boolean; errors?: string[] };
}

// API rate limiting configuration
export interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
}
