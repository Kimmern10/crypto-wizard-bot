
import { useCallback } from 'react';
import { toast } from 'sonner';
import { 
  KrakenPositionsResponse 
} from '@/types/krakenApiTypes';
import { krakenRequest, processPositionsData } from '@/utils/kraken/krakenApiUtils';

export const useKrakenPositions = (
  isConnected: boolean,
  userId: string | null,
  useProxyApi: boolean
) => {
  const fetchOpenPositions = useCallback(async () => {
    if (!isConnected) {
      console.error('Cannot fetch positions: Not connected to Kraken API');
      return null;
    }
    
    try {
      const positionsData = await krakenRequest<KrakenPositionsResponse>(
        'private/OpenPositions', 
        userId, 
        useProxyApi
      );
      
      console.log('Open positions data:', positionsData);
      return processPositionsData(positionsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to fetch open positions:', errorMessage);
      toast.error(`Failed to fetch open positions: ${errorMessage}`);
      return null;
    }
  }, [isConnected, userId, useProxyApi]);
  
  return { fetchOpenPositions };
};
