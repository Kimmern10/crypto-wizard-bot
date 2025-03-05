
import { useCallback } from 'react';
import { toast } from 'sonner';
import { 
  KrakenBalanceResponse 
} from '@/types/krakenApiTypes';
import { krakenRequest, processBalanceData } from '@/utils/kraken/krakenApiUtils';

export const useKrakenBalance = (
  isConnected: boolean,
  userId: string | null,
  useProxyApi: boolean
) => {
  const fetchBalance = useCallback(async () => {
    if (!isConnected) {
      console.error('Cannot fetch balance: Not connected to Kraken API');
      return null;
    }
    
    try {
      const balanceData = await krakenRequest<KrakenBalanceResponse>(
        'private/Balance', 
        userId, 
        useProxyApi
      );
      
      console.log('Account balance data:', balanceData);
      return processBalanceData(balanceData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to fetch balance:', errorMessage);
      toast.error(`Failed to fetch balance: ${errorMessage}`);
      return null;
    }
  }, [isConnected, userId, useProxyApi]);
  
  return { fetchBalance };
};
