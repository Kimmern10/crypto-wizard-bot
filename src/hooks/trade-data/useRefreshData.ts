
import { useCallback } from 'react';
import { toast } from 'sonner';
import { getConnectionStatus } from '@/utils/websocketManager';

/**
 * A hook for refreshing trade data from the Kraken API.
 * 
 * @param krakenApi - The Kraken API instance
 * @param tradeDataState - The trade data state object
 * @returns A function to refresh data
 */
export const useRefreshData = (
  krakenApi: any,
  tradeDataState: any
) => {
  const { 
    setCurrentBalance, 
    setActivePositions, 
    setTradeHistory,
    lastTickerData,
    setConnectionStatus
  } = tradeDataState;

  return useCallback(async () => {
    // Check the actual WebSocket connection status (including demo mode)
    const { isConnected, isDemoMode } = getConnectionStatus();
    
    // Allow refreshing if either API or WebSocket is connected, or we're in demo mode
    const canRefresh = krakenApi.isConnected || isConnected || isDemoMode;
    
    if (!canRefresh) {
      console.warn('Cannot refresh data: No API or WebSocket connection');
      toast.error('Cannot refresh data', {
        description: 'API connection is not established. Try restarting the connection.'
      });
      return;
    }

    try {
      console.log('Refreshing trading data...');
      let successCount = 0;
      let failCount = 0;
      
      // Refresh balance
      try {
        const balance = await krakenApi.fetchBalance();
        if (balance) {
          setCurrentBalance(balance);
          successCount++;
          console.log('Balance updated successfully');
        }
      } catch (error) {
        console.error('Error fetching balance:', error);
        failCount++;
      }
      
      // Refresh positions
      try {
        const positions = await krakenApi.fetchOpenPositions();
        if (positions) {
          setActivePositions(positions);
          successCount++;
          console.log('Positions updated successfully');
        }
      } catch (error) {
        console.error('Error fetching positions:', error);
        failCount++;
      }
      
      // Refresh trade history
      try {
        const trades = await krakenApi.fetchTradeHistory();
        if (trades) {
          setTradeHistory(trades);
          successCount++;
          console.log('Trade history updated successfully');
        }
      } catch (error) {
        console.error('Error fetching trade history:', error);
        failCount++;
      }
      
      // Ensure we're subscribed to all relevant pairs
      const activePairs = new Set<string>();
      
      // Add pairs from ticker data
      Object.keys(lastTickerData || {}).forEach(pair => {
        activePairs.add(pair);
      });
      
      // Update connection status based on results
      if (failCount > 0 && successCount === 0) {
        setConnectionStatus('Connected with errors');
        toast.error('Failed to refresh data', {
          description: 'All data fetches failed. Check connection and try again.'
        });
        throw new Error('All data fetches failed');
      } else if (failCount > 0) {
        // Some operations succeeded, some failed
        toast.warning('Data partially refreshed', {
          description: 'Some data could not be updated. Check connection.'
        });
        console.warn(`Data refresh partially succeeded: ${successCount} succeeded, ${failCount} failed`);
      } else if (successCount > 0) {
        // Everything succeeded
        if (isDemoMode) {
          setConnectionStatus('Connected (Demo Mode)');
        } else {
          setConnectionStatus('Connected');
        }
        toast.success('Trading data refreshed');
      } else {
        // No operations succeeded, but also none failed (shouldn't happen)
        toast.info('No data changes detected');
      }
      
      return;
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh trading data');
      throw error;
    }
  }, [
    krakenApi, 
    setCurrentBalance, 
    setActivePositions, 
    setTradeHistory, 
    lastTickerData,
    setConnectionStatus
  ]);
};
