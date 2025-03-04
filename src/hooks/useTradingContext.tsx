
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useApiCredentials } from '@/hooks/useApiCredentials';
import { useKrakenApi } from '@/hooks/useKrakenApi';
import { setupWebSocket } from '@/utils/tradingWebSocket';
import { getKrakenWebSocket } from '@/utils/websocketManager';
import { StrategyParams } from '@/types/trading';

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
  // Add missing properties for Dashboard component
  currentBalance: Record<string, number>;
  activePositions: any[];
  // Add missing properties for StrategyPanel component
  selectedStrategy: string;
  setSelectedStrategy: (strategy: string) => void;
  isRunning: boolean;
  toggleRunning: () => void;
  strategyParams: StrategyParams;
  updateStrategyParams: (params: Partial<StrategyParams>) => void;
  // Add missing property for TradeHistory component
  tradeHistory: any[];
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

export const TradingProvider = ({ children }: { children: ReactNode }) => {
  const [connectionStatus, setConnectionStatus] = useState<string>('Disconnected');
  const [lastConnectionEvent, setLastConnectionEvent] = useState<string>('');
  const [lastTickerData, setLastTickerData] = useState<Record<string, any>>({});
  const [selectedStrategy, setSelectedStrategy] = useState<string>('trend_following');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentBalance, setCurrentBalance] = useState<Record<string, number>>({
    USD: 10000,
    BTC: 0.5,
    ETH: 5.0
  });
  const [activePositions, setActivePositions] = useState<any[]>([]);
  const [tradeHistory, setTradeHistory] = useState<any[]>([]);
  const [strategyParams, setStrategyParams] = useState<StrategyParams>({
    riskLevel: 25,
    positionSize: 10,
    takeProfitEnabled: true,
    stopLossEnabled: true,
    takeProfitPercentage: 5,
    stopLossPercentage: 3,
    useMlOptimization: false
  });

  // Bruk API-legitimasjonshåndtereren
  const connectToKraken = async () => {
    try {
      await krakenApi.connect();
    } catch (error) {
      console.error('Failed to connect to Kraken API:', error);
    }
  };

  const { 
    apiKey, 
    apiSecret, 
    isApiConfigured,
    isApiKeyModalOpen,
    isLoadingCredentials,
    showApiKeyModal,
    hideApiKeyModal,
    setApiCredentials,
    clearApiCredentials
  } = useApiCredentials(connectToKraken);

  // Initialiser Kraken API-tjenesten
  const krakenApi = useKrakenApi({ apiKey, apiSecret });

  // Koble til WebSocket når API er konfigurert
  useEffect(() => {
    if (isApiConfigured) {
      console.log('API is configured, setting up WebSocket...');
      const cleanup = setupWebSocket(
        getKrakenWebSocket(),
        setConnectionStatus,
        setLastConnectionEvent,
        setLastTickerData
      );
      
      return cleanup;
    }
  }, [isApiConfigured]);

  // Update balance and history when connected
  useEffect(() => {
    if (krakenApi.isConnected) {
      // Fetch initial data
      const fetchInitialData = async () => {
        try {
          const balance = await krakenApi.fetchBalance();
          if (balance) {
            setCurrentBalance(balance);
          }
          
          const history = await krakenApi.fetchTradeHistory();
          if (history) {
            setTradeHistory(history);
          }
          
          const positions = await krakenApi.fetchOpenPositions();
          if (positions) {
            setActivePositions(positions);
          }
        } catch (error) {
          console.error('Error fetching initial data:', error);
        }
      };
      
      fetchInitialData();
    }
  }, [krakenApi.isConnected]);

  // Toggle running state for strategy
  const toggleRunning = () => {
    setIsRunning(prev => !prev);
  };

  // Update strategy parameters
  const updateStrategyParams = (params: Partial<StrategyParams>) => {
    setStrategyParams(prev => ({ ...prev, ...params }));
  };

  // Oppdater data
  const refreshData = async () => {
    console.log('Manually refreshing data...');
    try {
      if (krakenApi.isConnected) {
        const balance = await krakenApi.fetchBalance();
        if (balance) {
          setCurrentBalance(balance);
        }
        
        const history = await krakenApi.fetchTradeHistory();
        if (history) {
          setTradeHistory(history);
        }
        
        const positions = await krakenApi.fetchOpenPositions();
        if (positions) {
          setActivePositions(positions);
        }
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  return (
    <TradingContext.Provider value={{
      apiKey,
      apiSecret,
      isApiConfigured,
      isApiKeyModalOpen,
      isLoadingCredentials,
      isConnected: krakenApi.isConnected,
      isLoading: krakenApi.isLoading,
      connectionStatus,
      lastConnectionEvent,
      lastTickerData,
      error: krakenApi.error,
      connect: krakenApi.connect,
      showApiKeyModal,
      hideApiKeyModal,
      setApiCredentials,
      clearApiCredentials,
      refreshData,
      sendOrder: krakenApi.sendOrder,
      // Add the new properties
      currentBalance,
      activePositions,
      selectedStrategy,
      setSelectedStrategy,
      isRunning,
      toggleRunning,
      strategyParams,
      updateStrategyParams,
      tradeHistory
    }}>
      {children}
    </TradingContext.Provider>
  );
};

export const useTradingContext = () => {
  const context = useContext(TradingContext);
  if (context === undefined) {
    throw new Error('useTradingContext must be used within a TradingProvider');
  }
  return context;
};
