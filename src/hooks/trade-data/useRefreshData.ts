
import { useCallback } from 'react';
import { toast } from 'sonner';

export const useRefreshData = (
  krakenApi: any,
  tradeDataState: any
) => {
  const refreshData = useCallback(async (): Promise<void> => {
    console.log('Manually refreshing data...');
    toast.info('Refreshing trading data...');
    
    try {
      if (krakenApi.isConnected) {
        const balance = await krakenApi.fetchBalance();
        if (balance) {
          tradeDataState.setCurrentBalance(balance);
          console.log('Balance refreshed successfully');
        }
        
        const history = await krakenApi.fetchTradeHistory();
        if (history) {
          tradeDataState.setTradeHistory(history);
          console.log('Trade history refreshed successfully');
        }
        
        const positions = await krakenApi.fetchOpenPositions();
        if (positions) {
          tradeDataState.setActivePositions(positions);
          console.log('Positions refreshed successfully');
        }
        
        toast.success('Trading data refreshed successfully');
      } else {
        toast.error('Cannot refresh data: Not connected to API');
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh trading data');
    }
  }, [krakenApi, tradeDataState]);

  return refreshData;
};
