
import { useFetchInitialData } from './useFetchInitialData';
import { useRefreshData } from './useRefreshData';
import { toast } from 'sonner';

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
  // Use the specialized hooks for initial data fetching and refreshing
  const fetchInitialData = useFetchInitialData(krakenApi, tradeDataState);
  const refreshData = useRefreshData(krakenApi, tradeDataState);

  // Combined function to fetch all initial data
  const fetchData = async () => {
    try {
      console.log('Fetching initial trade data...');
      await fetchInitialData();
      toast.success('Trade data loaded successfully');
    } catch (error) {
      console.error('Error fetching initial trade data:', error);
      toast.error('Failed to load trade data');
    }
  };

  return {
    fetchData,
    refreshData
  };
};
