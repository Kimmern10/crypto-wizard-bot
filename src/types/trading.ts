
export interface OrderParams {
  pair: string;
  type: 'buy' | 'sell';
  ordertype: 'market' | 'limit';
  volume: string;
  price?: string;
}

export interface TradingContextType {
  apiKey: string;
  apiSecret: string;
  isApiConfigured: boolean;
  isConnected: boolean;
  setApiCredentials: (key: string, secret: string) => void;
  clearApiCredentials: () => void;
  showApiKeyModal: () => void;
  hideApiKeyModal: () => void;
  isApiKeyModalOpen: boolean;
  selectedStrategy: string;
  setSelectedStrategy: (strategy: string) => void;
  isRunning: boolean;
  toggleRunning: () => void;
  currentBalance: Record<string, number>;
  activePositions: any[];
  tradeHistory: any[];
  lastTickerData: Record<string, any>;
  connectionStatus: string;
  lastConnectionEvent: string;
}
