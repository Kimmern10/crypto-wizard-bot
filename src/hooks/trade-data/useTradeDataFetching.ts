
import { useFetchInitialData } from './useFetchInitialData';
import { useRefreshData } from './useRefreshData';
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
  
  // Use the specialized hooks for initial data fetching and refreshing
  const fetchInitialData = useFetchInitialData(krakenApi, tradeDataState);
  const refreshDataFn = useRefreshData(krakenApi, tradeDataState);

  // Combined function to fetch all initial data
  const fetchData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      console.log('Fetching initial trade data...');
      await fetchInitialData();
      setLastRefreshTime(Date.now());
      setRefreshError(null);
      toast.success('Trade data loaded successfully');
    } catch (error) {
      console.error('Error fetching initial trade data:', error);
      setRefreshError(error instanceof Error ? error.message : 'Unknown error');
      toast.error('Failed to load trade data');
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchInitialData]);

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
      await refreshDataFn();
      setLastRefreshTime(Date.now());
      setRefreshError(null);
    } catch (error) {
      console.error('Error refreshing data:', error);
      setRefreshError(error instanceof Error ? error.message : 'Unknown error');
      throw error; // Re-throw to allow caller to handle the error
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshDataFn, isRefreshing, lastRefreshTime]);
  
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
