
import { useCallback } from 'react';
import { toast } from 'sonner';

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
    if (!krakenApi.isConnected) {
      console.warn('Cannot fetch data: Kraken API not connected');
      return;
    }

    try {
      console.log('Fetching account balance...');
      const balance = await krakenApi.fetchBalance();
      if (balance) {
        setCurrentBalance(balance);
        console.log('Balance updated:', balance);
      }

      console.log('Fetching open positions...');
      const positions = await krakenApi.fetchOpenPositions();
      if (positions) {
        setActivePositions(positions);
        console.log('Positions updated:', positions.length, 'active positions');
      }

      console.log('Fetching trade history...');
      const trades = await krakenApi.fetchTradeHistory();
      if (trades) {
        setTradeHistory(trades);
        console.log('Trade history updated:', trades.length, 'trades');
      }

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

      return { balance, positions, trades };
    } catch (error) {
      console.error('Error fetching initial data:', error);
      toast.error('Failed to fetch trading data');
      throw error;
    }
  }, [krakenApi, setCurrentBalance, setActivePositions, setTradeHistory]);
};
