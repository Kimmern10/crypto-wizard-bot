
import { useCallback } from 'react';
import { toast } from 'sonner';
import { 
  OrderParams,
  KrakenOrderResponse
} from '@/types/krakenApiTypes';
import { krakenRequest } from '@/utils/kraken/krakenApiUtils';
import { saveOrderToSupabase } from '@/utils/tradeHistoryDb';

export const useKrakenOrders = (
  isConnected: boolean,
  corsRestricted: boolean,
  userId: string | null,
  useProxyApi: boolean
) => {
  const sendOrder = useCallback(async (params: OrderParams) => {
    if (!isConnected) {
      toast.error('Not connected to Kraken API');
      throw new Error('Not connected to Kraken API');
    }
    
    try {
      console.log('Sending order to Kraken:', params);
      
      const orderData = {
        pair: params.pair,
        type: params.type,
        ordertype: params.ordertype,
        volume: params.volume
      };
      
      if (params.ordertype === 'limit' && params.price) {
        Object.assign(orderData, { price: params.price });
      }
      
      const result = await krakenRequest<KrakenOrderResponse>(
        'private/AddOrder', 
        userId, 
        useProxyApi, 
        true, 
        'POST', 
        orderData
      );
      
      console.log('Order placed successfully:', result);
      
      if (corsRestricted) {
        toast.success(`${params.type.toUpperCase()} order for ${params.volume} ${params.pair} placed (Demo)`);
      } else {
        toast.success(`${params.type.toUpperCase()} order for ${params.volume} ${params.pair} placed successfully`);
      }
      
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid response format from Kraken API');
      }
      
      if (result.result && result.result.txid && Array.isArray(result.result.txid) && result.result.txid.length > 0) {
        await saveOrderToSupabase(result.result.txid[0], params);
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error sending order:', errorMessage);
      toast.error(`Failed to place order: ${errorMessage}`);
      throw err;
    }
  }, [isConnected, corsRestricted, userId, useProxyApi]);
  
  return { sendOrder };
};
