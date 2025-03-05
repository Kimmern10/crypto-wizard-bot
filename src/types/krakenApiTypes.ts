
// Types for Kraken API configurations and parameters
export interface KrakenApiConfig {
  apiKey: string;
  apiSecret: string;
}

export interface OrderParams {
  pair: string;
  type: 'buy' | 'sell';
  ordertype: 'market' | 'limit';
  volume: string;
  price?: string;
}

// Types for Kraken API responses
export interface KrakenTimeResponse {
  result: {
    unixtime: number;
    rfc1123: string;
  };
}

export interface KrakenBalanceResponse {
  result: Record<string, string>;
}

export interface KrakenPositionsResponse {
  result: Record<string, any>;
}

export interface KrakenTradesResponse {
  result: {
    trades: Record<string, any>;
    count: number;
  };
}

export interface KrakenOrderResponse {
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
  data: any;
  connect: () => Promise<void>;
  sendOrder: (params: OrderParams) => Promise<any>;
  fetchBalance: () => Promise<Record<string, number> | null>;
  fetchOpenPositions: () => Promise<any[] | null>;
  fetchTradeHistory: () => Promise<any[] | null>;
  subscribeToTicker: (pair: string) => void;
  unsubscribeFromTicker: (pair: string) => void;
}
