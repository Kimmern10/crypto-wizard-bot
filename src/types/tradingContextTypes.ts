
import { StrategyParams } from './trading';

export interface TradingContextType {
  apiKey: string;
  apiSecret: string;
  isApiConfigured: boolean;
  isApiKeyModalOpen: boolean;
  isLoadingCredentials: boolean;
  isConnected: boolean;
  isLoading: boolean;
  connectionStatus: string;
  lastConnectionEvent: string;
  lastTickerData: Record<string, any>;
  error: string | null;
  connect: () => Promise<void>;
  showApiKeyModal: () => void;
  hideApiKeyModal: () => void;
  setApiCredentials: (key: string, secret: string) => void;
  clearApiCredentials: () => void;
  refreshData: () => Promise<void>;
  sendOrder: (params: {
    pair: string;
    type: 'buy' | 'sell';
    ordertype: 'market' | 'limit';
    volume: string;
    price?: string;
  }) => Promise<any>;
  // Properties for Dashboard component
  currentBalance: Record<string, number>;
  activePositions: any[];
  // Properties for StrategyPanel component
  selectedStrategy: string;
  setSelectedStrategy: (strategy: string) => void;
  isRunning: boolean;
  toggleRunning: () => void;
  strategyParams: StrategyParams;
  updateStrategyParams: (params: Partial<StrategyParams>) => void;
  // Property for TradeHistory component
  tradeHistory: any[];
}
