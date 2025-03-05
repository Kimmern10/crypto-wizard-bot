
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { getConnectionStatus } from '@/utils/websocketManager';

/**
 * A hook that combines data fetching operations for trade data.
 * 
 * @param krakenApi - The Kraken API instance
 * @param tradeDataState - The trade data state object
 * @returns Object containing the fetchData and refreshData functions
 */
export const useTradeDataFetching = (
  krakenApi: any,
  tradeDataState: any
) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  
  // Combined function to fetch all initial data
  const fetchData = useCallback(async () => {
    try {
      // Get WebSocket connection status
      const { isConnected: wsConnected, isDemoMode } = getConnectionStatus();
      
      // Allow fetching if either API or WebSocket is connected or in demo mode
      const canFetch = krakenApi.isConnected || wsConnected || isDemoMode;
      
      if (!canFetch) {
        console.warn('Cannot fetch data: No API or WebSocket connection');
        toast.error('Cannot fetch data', {
          description: 'No connection to Kraken API. Try connecting first.'
        });
        throw new Error('No API or WebSocket connection');
      }
      
      setIsRefreshing(true);
      console.log('Fetching initial trade data...');
      
      let successCount = 0;
      let failCount = 0;
      
      // Function to safely execute API calls with error handling
      const safeApiCall = async (operation: string, apiCall: () => Promise<any>, setter: (data: any) => void) => {
        try {
          console.log(`Fetching ${operation}...`);
          const data = await apiCall();
          if (data) {
            setter(data);
            console.log(`${operation} updated successfully`);
            successCount++;
            return data;
          }
          failCount++;
          return null;
        } catch (error) {
          console.error(`Error fetching ${operation}:`, error);
          failCount++;
          return null;
        }
      };
      
      // Fetch all data in parallel for efficiency
      await Promise.all([
        // Fetch balance
        safeApiCall(
          'account balance', 
          () => krakenApi.fetchBalance(),
          tradeDataState.setCurrentBalance
        ),
        
        // Fetch positions
        safeApiCall(
          'open positions',
          () => krakenApi.fetchOpenPositions(),
          tradeDataState.setActivePositions
        ),
        
        // Fetch trade history
        safeApiCall(
          'trade history',
          () => krakenApi.fetchTradeHistory(),
          tradeDataState.setTradeHistory
        )
      ]);
      
      setLastRefreshTime(Date.now());
      setRefreshError(null);
      
      // Evaluate overall success
      if (failCount > 0 && successCount === 0) {
        toast.error('Failed to fetch any data');
        throw new Error('All data fetches failed');
      } else if (failCount > 0) {
        toast.warning('Some data could not be fetched', {
          description: 'Check your connection and try refreshing again.'
        });
      } else {
        toast.success('Data loaded successfully');
      }
    } catch (error) {
      console.error('Error fetching initial trade data:', error);
      setRefreshError(error instanceof Error ? error.message : 'Unknown error');
      throw error;
    } finally {
      setIsRefreshing(false);
    }
  }, [krakenApi, tradeDataState]);

  // Wrapper for the refresh function that includes loading state
  const refreshData = useCallback(async () => {
    // Don't refresh if we're already refreshing
    if (isRefreshing) {
      console.log('Already refreshing data, skipping request');
      return;
    }
    
    // Prevent rapid consecutive refreshes
    if (lastRefreshTime && Date.now() - lastRefreshTime < 5000) {
      console.log('Too soon since last refresh, skipping request');
      toast.info('Data refreshed recently, please wait a moment');
      return;
    }
    
    try {
      setIsRefreshing(true);
      await fetchData();
      setLastRefreshTime(Date.now());
      setRefreshError(null);
    } catch (error) {
      console.error('Error refreshing data:', error);
      setRefreshError(error instanceof Error ? error.message : 'Unknown error');
      throw error; // Re-throw to allow caller to handle the error
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchData, isRefreshing, lastRefreshTime]);
  
  // Auto-refresh data periodically when connected
  useEffect(() => {
    const { isConnected, isDemoMode } = getConnectionStatus();
    if (!isConnected && !isDemoMode && !krakenApi.isConnected) {
      return; // Don't auto-refresh if not connected
    }
    
    // Refresh data every 60 seconds
    const refreshInterval = setInterval(() => {
      console.log('Auto-refreshing trade data...');
      refreshData().catch(error => {
        console.error('Auto-refresh failed:', error);
      });
    }, 60000);
    
    return () => clearInterval(refreshInterval);
  }, [krakenApi.isConnected, refreshData]);

  return {
    fetchData,
    refreshData,
    isRefreshing,
    lastRefreshTime,
    refreshError
  };
};
