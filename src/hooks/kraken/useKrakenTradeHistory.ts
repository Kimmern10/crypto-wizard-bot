
import { useCallback } from 'react';
import { toast } from 'sonner';
import { 
  KrakenTradesResponse 
} from '@/types/krakenApiTypes';
import { krakenRequest, processTradesData } from '@/utils/kraken/krakenApiUtils';
import { 
  fetchTradesFromSupabase,
  saveTradesToSupabase 
} from '@/utils/tradeHistoryDb';

export const useKrakenTradeHistory = (
  isConnected: boolean,
  userId: string | null,
  useProxyApi: boolean
) => {
  const fetchTradeHistory = useCallback(async () => {
    if (!isConnected) {
      console.error('Cannot fetch trade history: Not connected to Kraken API');
      return null;
    }
    
    try {
      // First try to fetch from Supabase
      const localTrades = await fetchTradesFromSupabase();
      if (localTrades && localTrades.length > 0) {
        return localTrades;
      }
      
      // If no local trades, fetch from Kraken API
      const tradesData = await krakenRequest<KrakenTradesResponse>(
        'private/TradesHistory', 
        userId, 
        useProxyApi, 
        true, 
        'POST', 
        {
          start: Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60,
          end: Math.floor(Date.now() / 1000)
        }
      );
      
      console.log('Trade history data from API:', tradesData);
      
      const trades = processTradesData(tradesData);
      
      // Save the trades to Supabase
      if (trades.length > 0) {
        await saveTradesToSupabase(trades);
      }
      
      return trades;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to fetch trade history:', errorMessage);
      toast.error(`Failed to fetch trade history: ${errorMessage}`);
      return null;
    }
  }, [isConnected, userId, useProxyApi]);
  
  return { fetchTradeHistory };
};
