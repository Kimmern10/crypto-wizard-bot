
import { useState, useEffect, ReactNode } from 'react';
import TradingContext from '@/contexts/TradingContext';
import { useApiCredentials } from '@/hooks/useApiCredentials';
import { useKrakenApi } from '@/hooks/useKrakenApi';
import { useStrategyState } from '@/hooks/useStrategyState';
import { useTradeDataState } from '@/hooks/useTradeDataState';
import { setupWebSocket } from '@/utils/tradingWebSocket';
import { getKrakenWebSocket, initializeWebSocket } from '@/utils/websocketManager';
import { toast } from 'sonner';

export const TradingProvider = ({ children }: { children: ReactNode }) => {
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize hooks for state management
  const strategyState = useStrategyState();
  const tradeDataState = useTradeDataState();
  
  // Connect to Kraken function
  const connectToKraken = async () => {
    try {
      await krakenApi.connect();
    } catch (error) {
      console.error('Failed to connect to Kraken API:', error);
      toast.error('Failed to connect to Kraken API');
    }
  };

  // Initialize API credentials handler
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

  // Initialize Kraken API service
  const krakenApi = useKrakenApi({ apiKey, apiSecret });

  // Initialize WebSocket connection
  useEffect(() => {
    // Initialize WebSocket as early as possible
    console.log('Initializing WebSocket connection...');
    initializeWebSocket();
    setIsInitializing(false);
  }, []);
  
  // Connect to WebSocket when API is configured
  useEffect(() => {
    if (!isInitializing && (isApiConfigured || !apiKey)) {
      console.log('API state resolved, setting up WebSocket...');
      const cleanup = setupWebSocket(
        getKrakenWebSocket(),
        tradeDataState.setConnectionStatus,
        tradeDataState.setLastConnectionEvent,
        tradeDataState.setLastTickerData
      );
      
      return cleanup;
    }
  }, [isApiConfigured, isInitializing, apiKey]);

  // Update balance and history when connected
  useEffect(() => {
    if (krakenApi.isConnected) {
      // Fetch initial data
      const fetchInitialData = async () => {
        try {
          console.log('Fetching initial balance data...');
          const balance = await krakenApi.fetchBalance();
          if (balance) {
            tradeDataState.setCurrentBalance(balance);
          }
          
          console.log('Fetching initial trade history...');
          const history = await krakenApi.fetchTradeHistory();
          if (history) {
            tradeDataState.setTradeHistory(history);
          }
          
          console.log('Fetching initial positions data...');
          const positions = await krakenApi.fetchOpenPositions();
          if (positions) {
            tradeDataState.setActivePositions(positions);
          }
          
          console.log('Initial data fetch complete');
        } catch (error) {
          console.error('Error fetching initial data:', error);
          toast.error('Error fetching initial trading data');
        }
      };
      
      fetchInitialData();
    }
  }, [krakenApi.isConnected]);

  // Refresh data function
  const refreshData = async () => {
    console.log('Manually refreshing data...');
    toast.info('Refreshing trading data...');
    
    try {
      if (krakenApi.isConnected) {
        const balance = await krakenApi.fetchBalance();
        if (balance) {
          tradeDataState.setCurrentBalance(balance);
          console.log('Balance refreshed successfully');
        }
        
        const history = await krakenApi.fetchTradeHistory();
        if (history) {
          tradeDataState.setTradeHistory(history);
          console.log('Trade history refreshed successfully');
        }
        
        const positions = await krakenApi.fetchOpenPositions();
        if (positions) {
          tradeDataState.setActivePositions(positions);
          console.log('Positions refreshed successfully');
        }
        
        toast.success('Trading data refreshed successfully');
        return true;
      } else {
        toast.error('Cannot refresh data: Not connected to API');
        return false;
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh trading data');
      return false;
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
      connectionStatus: tradeDataState.connectionStatus,
      lastConnectionEvent: tradeDataState.lastConnectionEvent,
      lastTickerData: tradeDataState.lastTickerData,
      error: krakenApi.error,
      connect: krakenApi.connect,
      showApiKeyModal,
      hideApiKeyModal,
      setApiCredentials,
      clearApiCredentials,
      refreshData,
      sendOrder: krakenApi.sendOrder,
      // Trade data properties
      currentBalance: tradeDataState.currentBalance,
      activePositions: tradeDataState.activePositions,
      tradeHistory: tradeDataState.tradeHistory,
      // Strategy properties
      selectedStrategy: strategyState.selectedStrategy,
      setSelectedStrategy: strategyState.setSelectedStrategy,
      isRunning: strategyState.isRunning,
      toggleRunning: strategyState.toggleRunning,
      strategyParams: strategyState.strategyParams,
      updateStrategyParams: strategyState.updateStrategyParams
    }}>
      {children}
    </TradingContext.Provider>
  );
};
