
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';
import { WebSocketManager, getKrakenWebSocket } from '@/utils/websocketManager';
import { useKrakenApi } from '@/hooks/useKrakenApi';
import { setupWebSocket } from '@/utils/tradingWebSocket';
import { startTradingBot, stopTradingBot, getBotStatus } from '@/utils/tradingBot';
import { useApiCredentials } from '@/hooks/useApiCredentials';
import { TradingContextType } from '@/types/trading';

const TradingContext = createContext<TradingContextType | undefined>(undefined);

interface TradingProviderProps {
  children: ReactNode;
}

export const TradingProvider: React.FC<TradingProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('trend_following');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentBalance, setCurrentBalance] = useState<Record<string, number>>({
    BTC: 0,
    ETH: 0,
    USD: 0,
  });
  const [activePositions, setActivePositions] = useState<any[]>([]);
  const [tradeHistory, setTradeHistory] = useState<any[]>([]);
  const [lastTickerData, setLastTickerData] = useState<Record<string, any>>({});
  const [connectionStatus, setConnectionStatus] = useState<string>('Disconnected');
  const [lastConnectionEvent, setLastConnectionEvent] = useState<string>('');
  const [wsManager, setWsManager] = useState<WebSocketManager | null>(null);
  const [strategyParams, setStrategyParams] = useState({
    riskLevel: 50,
    positionSize: 5,
    takeProfitEnabled: true,
    stopLossEnabled: true,
    takeProfitPercentage: 3.5,
    stopLossPercentage: 2.5,
    useMlOptimization: true
  });

  const connectToKraken = async () => {
    try {
      if (krakenApi.connect) {
        await krakenApi.connect();
        setIsConnected(true);
        toast.success('Connected to Kraken API');
      }
    } catch (error) {
      console.error('Failed to connect to Kraken API:', error);
      setIsConnected(false);
      toast.error('Failed to connect to Kraken API');
    }
  };

  const {
    apiKey,
    apiSecret,
    isApiConfigured,
    isApiKeyModalOpen,
    setApiCredentials,
    clearApiCredentials,
    showApiKeyModal,
    hideApiKeyModal
  } = useApiCredentials(connectToKraken);

  const krakenApi = useKrakenApi({ apiKey, apiSecret });

  useEffect(() => {
    if (apiKey && apiSecret) {
      connectToKraken();
    } else {
      setIsConnected(false);
      setConnectionStatus('Disconnected');
    }
  }, [apiKey, apiSecret]);

  useEffect(() => {
    let cleanupWs: (() => void) | undefined;
    
    if (isConnected) {
      const ws = getKrakenWebSocket();
      setWsManager(ws);
      
      // Setup WebSocket with appropriate handlers
      cleanupWs = setupWebSocket(
        ws,
        setConnectionStatus,
        setLastConnectionEvent,
        setLastTickerData
      );
    }
    
    return () => {
      // Clean up WebSocket on unmount
      if (cleanupWs) {
        cleanupWs();
      }
      
      // Also ensure bot is stopped on unmount
      if (isRunning) {
        stopTradingBot();
        setIsRunning(false);
      }
    };
  }, [isConnected]);

  // Fetch account data periodically when connected
  useEffect(() => {
    if (!isConnected || !krakenApi.isConnected) return;
    
    // Initial fetch
    fetchAccountData();
    
    // Setup interval for periodic updates
    const dataRefreshInterval = setInterval(fetchAccountData, 60000); // Every minute
    
    return () => {
      clearInterval(dataRefreshInterval);
    };
  }, [isConnected, krakenApi.isConnected]);

  const fetchAccountData = async () => {
    if (!isConnected || !krakenApi.isConnected) return;
    
    try {
      // Fetch balance data
      const balanceData = await krakenApi.fetchBalance();
      if (balanceData) {
        setCurrentBalance(balanceData);
      }
      
      // Fetch positions
      const positionsData = await krakenApi.fetchOpenPositions();
      if (positionsData) {
        setActivePositions(positionsData);
      }
      
      // Fetch trade history
      const tradesData = await krakenApi.fetchTradeHistory();
      if (tradesData) {
        setTradeHistory(tradesData);
      }
    } catch (error) {
      console.error('Failed to fetch account data:', error);
    }
  };

  const toggleRunning = () => {
    if (!isRunning && isConnected) {
      setIsRunning(true);
      
      const isDemoMode = connectionStatus.toLowerCase().includes('demo') || 
                         connectionStatus.toLowerCase().includes('cors');
      
      if (isDemoMode) {
        toast.success('Trading bot started in demo mode', {
          description: 'No actual trades will be executed'
        });
      } else {
        toast.success('Trading bot started');
      }
      
      startTradingBot(
        isDemoMode, // Pass demo mode status to the bot
        selectedStrategy,
        krakenApi.sendOrder,
        krakenApi.fetchBalance,
        krakenApi.fetchOpenPositions,
        krakenApi.fetchTradeHistory,
        strategyParams
      );
    } else if (isRunning) {
      setIsRunning(false);
      toast.info('Trading bot stopped');
      stopTradingBot();
    } else {
      toast.error('Please connect to the Kraken API first');
    }
  };

  // Update strategy parameters
  const updateStrategyParams = (params: Partial<typeof strategyParams>) => {
    setStrategyParams(prev => ({
      ...prev,
      ...params
    }));
  };

  const value: TradingContextType = {
    apiKey,
    apiSecret,
    isApiConfigured,
    isConnected,
    setApiCredentials,
    clearApiCredentials,
    showApiKeyModal,
    hideApiKeyModal,
    isApiKeyModalOpen,
    selectedStrategy,
    setSelectedStrategy,
    isRunning,
    toggleRunning,
    currentBalance,
    activePositions,
    tradeHistory,
    lastTickerData,
    connectionStatus,
    lastConnectionEvent,
    strategyParams,
    updateStrategyParams,
    refreshData: fetchAccountData
  };

  return (
    <TradingContext.Provider value={value}>
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
