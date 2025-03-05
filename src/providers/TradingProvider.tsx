
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
import { useAuth } from '@/contexts/AuthContext';

export const TradingProvider = ({ children }: { children: ReactNode }) => {
  const strategyState = useStrategyState();
  const tradeDataState = useTradeDataState();
  const [isInitialDataFetched, setIsInitialDataFetched] = useState(false);
  const { isAuthenticated, user } = useAuth();

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
    clearApiCredentials,
    error: credentialsError
  } = useApiCredentials({
    onConnect: connectToKraken,
    timeout: 15000 // 15 seconds timeout
  });

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

  // Fetch initial data when connected with improved error handling
  useEffect(() => {
    if ((krakenApi.isConnected || isDemoMode) && !isInitialDataFetched) {
      console.log('Connected, fetching initial data...');
      
      // Add a timeout to prevent infinite loading state
      const timeoutId = setTimeout(() => {
        if (tradeDataState.isLoading) {
          console.warn('Initial data loading timeout reached');
          tradeDataState.setIsLoading(false);
          tradeDataState.setLoadingMessage('');
          tradeDataState.setErrorState('Loading timed out. Using demo data.');
          setIsInitialDataFetched(true); // Mark as fetched to avoid repeated attempts
          toast.warning('Data loading timed out', {
            description: 'Using simulated data. Check your connection and API credentials.'
          });
        }
      }, 30000); // 30 seconds timeout
      
      tradeDataState.setIsLoading(true);
      tradeDataState.setLoadingMessage('Loading initial data...');
      
      fetchData()
        .then(() => {
          clearTimeout(timeoutId);
          setIsInitialDataFetched(true);
          tradeDataState.setLastDataRefresh(new Date());
          toast.success('Initial data loaded successfully');
        })
        .catch(error => {
          clearTimeout(timeoutId);
          console.error('Failed to fetch initial data:', error);
          tradeDataState.setErrorState(`Failed to load initial data: ${error.message}`);
          toast.error('Failed to load data', {
            description: 'Check your API credentials and connection.'
          });
          
          // Still mark as fetched to avoid repeated attempts that will fail
          setIsInitialDataFetched(true);
        })
        .finally(() => {
          clearTimeout(timeoutId);
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

  // Enhanced refreshData function with loading indicators and timeouts
  const handleRefreshData = useCallback(async () => {
    tradeDataState.setIsLoading(true);
    tradeDataState.setLoadingMessage('Refreshing data...');
    
    // Add a timeout to prevent infinite loading state
    const timeoutId = setTimeout(() => {
      if (tradeDataState.isLoading) {
        console.warn('Data refresh timeout reached');
        tradeDataState.setIsLoading(false);
        tradeDataState.setLoadingMessage('');
        tradeDataState.setErrorState('Refresh timed out. Using last known data.');
        toast.warning('Data refresh timed out', {
          description: 'Using last known data. Check your connection.'
        });
      }
    }, 20000); // 20 seconds timeout
    
    try {
      await refreshData();
      clearTimeout(timeoutId);
      tradeDataState.setLastDataRefresh(new Date());
      tradeDataState.setErrorState(null);
      toast.success('Data refreshed successfully');
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Error in handleRefreshData:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      tradeDataState.setErrorState(errorMessage);
      toast.error('Failed to refresh data', {
        description: errorMessage
      });
      throw error;
    } finally {
      clearTimeout(timeoutId);
      tradeDataState.setIsLoading(false);
      tradeDataState.setLoadingMessage('');
    }
  }, [refreshData, tradeDataState]);

  // Enhanced restart connection function with better error handling and timeouts
  const handleRestartConnection = useCallback(async () => {
    tradeDataState.setIsLoading(true);
    tradeDataState.setLoadingMessage('Restarting connection...');
    
    // Add a timeout to prevent infinite loading state
    const timeoutId = setTimeout(() => {
      if (tradeDataState.isLoading) {
        console.warn('Connection restart timeout reached');
        tradeDataState.setIsLoading(false);
        tradeDataState.setLoadingMessage('');
        tradeDataState.setErrorState('Connection restart timed out. Switching to demo mode.');
        toast.warning('Connection restart timed out', {
          description: 'Switching to demo mode for now.'
        });
      }
    }, 15000); // 15 seconds timeout
    
    try {
      await restartConnection();
      clearTimeout(timeoutId);
      tradeDataState.setErrorState(null);
      toast.success('Connection restarted');
      
      // After restart, try to fetch fresh data
      await handleRefreshData();
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Error in handleRestartConnection:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      tradeDataState.setErrorState(errorMessage);
      toast.error('Failed to restart connection', {
        description: errorMessage
      });
      throw error;
    } finally {
      clearTimeout(timeoutId);
      tradeDataState.setIsLoading(false);
      tradeDataState.setLoadingMessage('');
    }
  }, [restartConnection, handleRefreshData, tradeDataState]);
  
  // If in demo mode, always show as connected with demo indicator
  const effectiveConnectionStatus = isDemoMode 
    ? 'Connected (Demo Mode)' 
    : tradeDataState.connectionStatus;

  // Combine all possible error sources for better error reporting
  const combinedError = credentialsError || krakenApi.error || tradeDataState.errorState || refreshError;

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
      error: combinedError,
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
      overallProfitLoss: tradeDataState.overallProfitLoss,
      isAuthenticated,
      user
    }}>
      {children}
    </TradingContext.Provider>
  );
};
