
import { useCallback } from 'react';
import { toast } from 'sonner';

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
    lastTickerData
  } = tradeDataState;

  return useCallback(async () => {
    if (!krakenApi.isConnected) {
      console.warn('Cannot refresh data: Kraken API not connected');
      return;
    }

    try {
      console.log('Refreshing trading data...');
      
      // Refresh balance
      const balance = await krakenApi.fetchBalance();
      if (balance) {
        setCurrentBalance(balance);
      }
      
      // Refresh positions
      const positions = await krakenApi.fetchOpenPositions();
      if (positions) {
        setActivePositions(positions);
      }
      
      // Refresh trade history only if we have active positions or it's been requested explicitly
      const trades = await krakenApi.fetchTradeHistory();
      if (trades) {
        setTradeHistory(trades);
      }
      
      // Ensure we're subscribed to all relevant pairs
      const activePairs = new Set<string>();
      
      // Add pairs from ticker data
      Object.keys(lastTickerData || {}).forEach(pair => {
        activePairs.add(pair);
      });
      
      // Add pairs from positions
      if (positions && positions.length > 0) {
        positions.forEach((position: any) => {
          if (position.pair) activePairs.add(position.pair);
        });
      }
      
      // Refresh subscriptions for active pairs in a smarter way
      // Instead of unsubscribing and resubscribing, we'll just ensure we're subscribed
      activePairs.forEach((pair: string) => {
        // Just ensure the subscription is active
        krakenApi.subscribeToTicker(pair);
      });
      
      toast.success('Trading data refreshed');
      
      // Return void instead of the data object
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
    lastTickerData
  ]);
};
