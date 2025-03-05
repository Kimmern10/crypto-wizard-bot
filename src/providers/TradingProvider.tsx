
import { useState, useEffect, ReactNode } from 'react';
import TradingContext from '@/contexts/TradingContext';
import { useApiCredentials } from '@/hooks/useApiCredentials';
import { useKrakenApi } from '@/hooks/useKrakenApi';
import { useStrategyState } from '@/hooks/useStrategyState';
import { useTradeDataState } from '@/hooks/useTradeDataState';
import { setupWebSocket } from '@/utils/tradingWebSocket';
import { getKrakenWebSocket } from '@/utils/websocketManager';

export const TradingProvider = ({ children }: { children: ReactNode }) => {
  const [error, setError] = useState<string | null>(null);

  // Initialize hooks for state management
  const strategyState = useStrategyState();
  const tradeDataState = useTradeDataState();
  
  // Connect to Kraken function
  const connectToKraken = async () => {
    try {
      await krakenApi.connect();
    } catch (error) {
      console.error('Failed to connect to Kraken API:', error);
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

  // Connect to WebSocket when API is configured
  useEffect(() => {
    if (isApiConfigured) {
      console.log('API is configured, setting up WebSocket...');
      const cleanup = setupWebSocket(
        getKrakenWebSocket(),
        tradeDataState.setConnectionStatus,
        tradeDataState.setLastConnectionEvent,
        tradeDataState.setLastTickerData
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
            tradeDataState.setCurrentBalance(balance);
          }
          
          const history = await krakenApi.fetchTradeHistory();
          if (history) {
            tradeDataState.setTradeHistory(history);
          }
          
          const positions = await krakenApi.fetchOpenPositions();
          if (positions) {
            tradeDataState.setActivePositions(positions);
          }
        } catch (error) {
          console.error('Error fetching initial data:', error);
        }
      };
      
      fetchInitialData();
    }
  }, [krakenApi.isConnected]);

  // Refresh data function
  const refreshData = async () => {
    console.log('Manually refreshing data...');
    try {
      if (krakenApi.isConnected) {
        const balance = await krakenApi.fetchBalance();
        if (balance) {
          tradeDataState.setCurrentBalance(balance);
        }
        
        const history = await krakenApi.fetchTradeHistory();
        if (history) {
          tradeDataState.setTradeHistory(history);
        }
        
        const positions = await krakenApi.fetchOpenPositions();
        if (positions) {
          tradeDataState.setActivePositions(positions);
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
