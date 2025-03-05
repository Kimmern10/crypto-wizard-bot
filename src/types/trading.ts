
export interface OrderParams {
  pair: string;
  type: 'buy' | 'sell';
  ordertype: 'market' | 'limit';
  volume: string;
  price?: string;
}

export interface StrategyParams {
  riskLevel: number;
  positionSize: number;
  takeProfitEnabled: boolean;
  stopLossEnabled: boolean;
  takeProfitPercentage: number;
  stopLossPercentage: number;
  useMlOptimization: boolean;
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
  strategyParams: StrategyParams;
  updateStrategyParams: (params: Partial<StrategyParams>) => void;
  refreshData: () => Promise<void>;
  availableStrategies: {
    id: string;
    name: string;
    description: string;
    riskLevel: string;
  }[];
  dryRunMode: boolean;
  toggleDryRunMode: () => void;
}

export interface TradePosition {
  id: string;
  pair: string;
  type: 'buy' | 'sell';
  entryPrice: number;
  currentPrice: number;
  volume: number;
  pnl: number;
  pnlPercentage: number;
  openTime: string;
  stopLoss: number | null;
  takeProfit: number | null;
}

export interface HistoricalTrade {
  id: string;
  pair: string;
  type: 'buy' | 'sell';
  price: number;
  volume: number;
  cost: number;
  fee: number;
  time: string;
  profit?: number;
  profitPercentage?: number;
}
