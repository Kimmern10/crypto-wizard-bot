
import { useState, useEffect, ReactNode } from 'react';
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
  
  // Extract data fetching logic
  const { fetchData, refreshData } = useTradeDataFetching(krakenApi, tradeDataState);

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
    if (krakenApi.isConnected) {
      fetchData();
    }
  }, [krakenApi.isConnected]);

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
      restartConnection,
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
      toggleDryRunMode
    }}>
      {children}
    </TradingContext.Provider>
  );
};
