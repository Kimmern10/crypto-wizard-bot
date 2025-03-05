
import { useFetchInitialData } from './useFetchInitialData';
import { useRefreshData } from './useRefreshData';

export const useTradeDataFetching = (
  krakenApi: any,
  tradeDataState: any
) => {
  const fetchData = useFetchInitialData(krakenApi, tradeDataState);
  const refreshData = useRefreshData(krakenApi, tradeDataState);

  return {
    fetchData,
    refreshData
  };
};
