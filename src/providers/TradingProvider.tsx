
import { useState, useEffect, ReactNode, useCallback } from 'react';
import { toast } from 'sonner';
import TradingContext from '@/contexts/TradingContext';
import { useApiCredentials } from '@/hooks/useApiCredentials';
import { useKrakenApi } from '@/hooks/useKrakenApi';
import { useStrategyState } from '@/hooks/useStrategyState';
import { useTradeDataState } from '@/hooks/useTradeDataState';
import { setupWebSocket } from '@/utils/tradingWebSocket';
import { getConnectionStatus, getKrakenWebSocket } from '@/utils/websocketManager';
import { useConnectionState } from '@/hooks/useConnectionState';
import { useDryRunMode } from '@/hooks/useDryRunMode';
import { useTradeDataFetching } from '@/hooks/useTradeDataFetching';
import { availableStrategies } from '@/data/availableStrategies';

export const TradingProvider = ({ children }: { children: ReactNode }) => {
  const strategyState = useStrategyState();
  const tradeDataState = useTradeDataState();
  const [isInitialDataFetched, setIsInitialDataFetched] = useState(false);

  // Extract connection state logic
  const { 
    isInitializing, 
    wsConnected, 
    isDemoMode, 
    restartConnection 
  } = useConnectionState();

  // Extract dry run mode logic
  const { dryRunMode, toggleDryRunMode } = useDryRunMode();

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
  
  // Extract data fetching logic with improved tracking
  const { 
    fetchData, 
    refreshData, 
    isRefreshing,
    lastRefreshTime,
    refreshError 
  } = useTradeDataFetching(krakenApi, tradeDataState);

  // WebSocket setup after API state is resolved
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

  // Fetch initial data when connected
  useEffect(() => {
    if ((krakenApi.isConnected || isDemoMode) && !isInitialDataFetched) {
      tradeDataState.setIsLoading(true);
      tradeDataState.setLoadingMessage('Loading initial data...');
      
      fetchData()
        .then(() => {
          setIsInitialDataFetched(true);
          tradeDataState.setLastDataRefresh(new Date());
        })
        .catch(error => {
          console.error('Failed to fetch initial data:', error);
          tradeDataState.setErrorState('Failed to load initial data');
        })
        .finally(() => {
          tradeDataState.setIsLoading(false);
          tradeDataState.setLoadingMessage('');
        });
    }
  }, [krakenApi.isConnected, isDemoMode, isInitialDataFetched, fetchData]);

  // Update connection status based on demo mode
  useEffect(() => {
    // If in demo mode, always show as connected with demo indicator
    if (isDemoMode && tradeDataState.connectionStatus !== 'Connected (Demo Mode)') {
      tradeDataState.setConnectionStatus('Connected (Demo Mode)');
    } else if (!wsConnected && !isDemoMode && 
               !tradeDataState.connectionStatus.includes('Connecting') &&
               !tradeDataState.connectionStatus.includes('reconnecting')) {
      tradeDataState.setConnectionStatus('Disconnected');
    }
  }, [isDemoMode, wsConnected, tradeDataState.connectionStatus]);

  // Enhanced refreshData function with loading indicators
  const handleRefreshData = useCallback(async () => {
    tradeDataState.setIsLoading(true);
    tradeDataState.setLoadingMessage('Refreshing data...');
    
    try {
      await refreshData();
      tradeDataState.setLastDataRefresh(new Date());
      tradeDataState.setErrorState(null);
    } catch (error) {
      console.error('Error in handleRefreshData:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      tradeDataState.setErrorState(errorMessage);
      throw error;
    } finally {
      tradeDataState.setIsLoading(false);
      tradeDataState.setLoadingMessage('');
    }
  }, [refreshData, tradeDataState]);

  // Enhanced restart connection function with better error handling
  const handleRestartConnection = useCallback(async () => {
    tradeDataState.setIsLoading(true);
    tradeDataState.setLoadingMessage('Restarting connection...');
    
    try {
      await restartConnection();
      tradeDataState.setErrorState(null);
      
      // After restart, try to fetch fresh data
      await handleRefreshData();
    } catch (error) {
      console.error('Error in handleRestartConnection:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      tradeDataState.setErrorState(errorMessage);
      throw error;
    } finally {
      tradeDataState.setIsLoading(false);
      tradeDataState.setLoadingMessage('');
    }
  }, [restartConnection, handleRefreshData, tradeDataState]);
  
  // If in demo mode, always show as connected with demo indicator
  const effectiveConnectionStatus = isDemoMode 
    ? 'Connected (Demo Mode)' 
    : tradeDataState.connectionStatus;

  return (
    <TradingContext.Provider value={{
      apiKey,
      apiSecret,
      isApiConfigured,
      isApiKeyModalOpen,
      isLoadingCredentials,
      isConnected: wsConnected || isDemoMode || krakenApi.isConnected, // Consider any connection as connected
      isLoading: krakenApi.isLoading || tradeDataState.isLoading || isRefreshing,
      connectionStatus: effectiveConnectionStatus,
      lastConnectionEvent: tradeDataState.lastConnectionEvent,
      lastTickerData: tradeDataState.lastTickerData,
      error: krakenApi.error || tradeDataState.errorState || refreshError,
      connect: krakenApi.connect,
      showApiKeyModal,
      hideApiKeyModal,
      setApiCredentials,
      clearApiCredentials,
      refreshData: handleRefreshData,
      restartConnection: handleRestartConnection,
      sendOrder: krakenApi.sendOrder,
      currentBalance: tradeDataState.currentBalance,
      activePositions: tradeDataState.activePositions,
      tradeHistory: tradeDataState.tradeHistory,
      selectedStrategy: strategyState.selectedStrategy,
      setSelectedStrategy: strategyState.setSelectedStrategy,
      isRunning: strategyState.isRunning,
      toggleRunning: strategyState.toggleRunning,
      strategyParams: strategyState.strategyParams,
      updateStrategyParams: strategyState.updateStrategyParams,
      availableStrategies,
      dryRunMode,
      toggleDryRunMode,
      isInitialDataFetched,
      lastDataRefresh: tradeDataState.lastDataRefresh,
      isRefreshing,
      dailyChangePercent: tradeDataState.dailyChangePercent,
      overallProfitLoss: tradeDataState.overallProfitLoss
    }}>
      {children}
    </TradingContext.Provider>
  );
};
