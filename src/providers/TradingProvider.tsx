
import { useState, useEffect, ReactNode } from 'react';
import TradingContext from '@/contexts/TradingContext';
import { useApiCredentials } from '@/hooks/useApiCredentials';
import { useKrakenApi } from '@/hooks/useKrakenApi';
import { useStrategyState } from '@/hooks/useStrategyState';
import { useTradeDataState } from '@/hooks/useTradeDataState';
import { setupWebSocket } from '@/utils/tradingWebSocket';
import { getKrakenWebSocket, initializeWebSocket, getConnectionStatus } from '@/utils/websocketManager';
import { toast } from 'sonner';

export const TradingProvider = ({ children }: { children: ReactNode }) => {
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const strategyState = useStrategyState();
  const tradeDataState = useTradeDataState();

  const connectToKraken = async () => {
    try {
      await krakenApi.connect();
    } catch (error) {
      console.error('Failed to connect to Kraken API:', error);
      toast.error('Failed to connect to Kraken API');
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

  const krakenApi = useKrakenApi({ apiKey, apiSecret });

  useEffect(() => {
    console.log('Initializing WebSocket connection...');
    initializeWebSocket();
    setIsInitializing(false);
  }, []);

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

  useEffect(() => {
    if (krakenApi.isConnected) {
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

  const refreshData = async (): Promise<void> => {
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
      } else {
        toast.error('Cannot refresh data: Not connected to API');
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh trading data');
    }
  };

  // Get the true connection status including demo mode
  const { isConnected: wsConnected, isDemoMode } = getConnectionStatus();
  const effectiveConnectionStatus = isDemoMode ? 'Connected (Demo Mode)' : tradeDataState.connectionStatus;

  return (
    <TradingContext.Provider value={{
      apiKey,
      apiSecret,
      isApiConfigured,
      isApiKeyModalOpen,
      isLoadingCredentials,
      isConnected: wsConnected || isDemoMode, // Consider demo mode as connected
      isLoading: krakenApi.isLoading,
      connectionStatus: effectiveConnectionStatus,
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
      currentBalance: tradeDataState.currentBalance,
      activePositions: tradeDataState.activePositions,
      tradeHistory: tradeDataState.tradeHistory,
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
