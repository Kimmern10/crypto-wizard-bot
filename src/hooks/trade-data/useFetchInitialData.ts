
import { useCallback } from 'react';
import { toast } from 'sonner';
import { getConnectionStatus } from '@/utils/websocketManager';

/**
 * A hook for fetching initial trade data from the Kraken API.
 * 
 * @param krakenApi - The Kraken API instance
 * @param tradeDataState - The trade data state object
 * @returns A function to fetch initial data
 */
export const useFetchInitialData = (
  krakenApi: any,
  tradeDataState: any
) => {
  const { 
    setCurrentBalance, 
    setActivePositions, 
    setTradeHistory 
  } = tradeDataState;

  return useCallback(async () => {
    // Check the actual WebSocket connection status (including demo mode)
    const { isConnected, isDemoMode } = getConnectionStatus();
    
    // Allow fetching if either API or WebSocket is connected, or we're in demo mode
    const canFetch = krakenApi.isConnected || isConnected || isDemoMode;
    
    if (!canFetch) {
      console.warn('Cannot fetch data: No API or WebSocket connection');
      toast.error('Cannot fetch data', {
        description: 'API connection is not established. Try connecting first.'
      });
      throw new Error('No API or WebSocket connection');
    }

    try {
      let successCount = 0;
      let failCount = 0;
      
      // Function to safely execute API calls with error handling
      const safeApiCall = async (operation: string, apiCall: () => Promise<any>, setter: (data: any) => void) => {
        try {
          console.log(`Fetching ${operation}...`);
          const data = await apiCall();
          if (data) {
            setter(data);
            console.log(`${operation} updated:`, operation === 'account balance' ? data : `${data.length} items`);
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
      
      // Fetch balance
      const balance = await safeApiCall(
        'account balance', 
        () => krakenApi.fetchBalance(),
        setCurrentBalance
      );
      
      // Fetch positions
      const positions = await safeApiCall(
        'open positions',
        () => krakenApi.fetchOpenPositions(),
        setActivePositions
      );
      
      // Fetch trade history
      const trades = await safeApiCall(
        'trade history',
        () => krakenApi.fetchTradeHistory(),
        setTradeHistory
      );

      // Subscribe to relevant ticker data based on positions and trade history
      const uniquePairs = new Set<string>();
      
      // Add pairs from positions
      if (positions && positions.length > 0) {
        positions.forEach((position: any) => {
          if (position.pair) uniquePairs.add(position.pair);
        });
      }
      
      // Add pairs from recent trades
      if (trades && trades.length > 0) {
        trades.slice(0, 10).forEach((trade: any) => {
          if (trade.pair) uniquePairs.add(trade.pair);
        });
      }
      
      // Add default pairs if no active pairs found
      if (uniquePairs.size === 0) {
        uniquePairs.add('XBT/USD');
        uniquePairs.add('ETH/USD');
      }
      
      // Subscribe to each pair's ticker data
      uniquePairs.forEach((pair: string) => {
        console.log(`Setting up subscription for ${pair}`);
        krakenApi.subscribeToTicker(pair);
      });

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

      return;
    } catch (error) {
      console.error('Error fetching initial data:', error);
      toast.error('Failed to fetch trading data');
      throw error;
    }
  }, [krakenApi, setCurrentBalance, setActivePositions, setTradeHistory]);
};
