
import { useCallback } from 'react';
import { toast } from 'sonner';

export const useFetchInitialData = (
  krakenApi: any,
  tradeDataState: any
) => {
  const fetchData = useCallback(async (): Promise<void> => {
    try {
      console.log('Fetching initial balance data...');
      const balance = await krakenApi.fetchBalance();
      if (balance) {
        tradeDataState.setCurrentBalance(balance);
      }
      
      console.log('Fetching initial trade history...');
      const history = await krakenApi.fetchTradeHistory();
      if (history) {
        tradeDataState.setTradeHistory(history);
      }
      
      console.log('Fetching initial positions data...');
      const positions = await krakenApi.fetchOpenPositions();
      if (positions) {
        tradeDataState.setActivePositions(positions);
      }
      
      console.log('Initial data fetch complete');
    } catch (error) {
      console.error('Error fetching initial data:', error);
      toast.error('Error fetching initial trading data');
    }
  }, [krakenApi, tradeDataState]);

  return fetchData;
};
