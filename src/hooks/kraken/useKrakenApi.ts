
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  KrakenApiConfig, 
  KrakenApiResponse,
  KrakenTimeResponse
} from '@/types/krakenApiTypes';
import { useKrakenBalance } from './useKrakenBalance';
import { useKrakenPositions } from './useKrakenPositions';
import { useKrakenTradeHistory } from './useKrakenTradeHistory';
import { useKrakenOrders } from './useKrakenOrders';
import { useKrakenWebSocket } from './useKrakenWebSocket';
import { krakenRequest } from '@/utils/kraken/krakenApiUtils';

export const useKrakenApi = (config: KrakenApiConfig): KrakenApiResponse => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [corsRestricted, setCorsRestricted] = useState(false);
  const [useProxyApi, setUseProxyApi] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  
  const { fetchBalance } = useKrakenBalance(isConnected, userId, useProxyApi);
  const { fetchOpenPositions } = useKrakenPositions(isConnected, userId, useProxyApi);
  const { fetchTradeHistory } = useKrakenTradeHistory(isConnected, userId, useProxyApi);
  const { sendOrder } = useKrakenOrders(isConnected, corsRestricted, userId, useProxyApi);
  const { subscribeToTicker, unsubscribeFromTicker } = useKrakenWebSocket();
  
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user?.id) {
        setUserId(data.session.user.id);
      }
    };
    
    checkSession();
    setUseProxyApi(true);
  }, []);
  
  const connect = useCallback(async () => {
    if ((!config.apiKey || !config.apiSecret) && !userId) {
      setError('API credentials or user authentication required');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Attempting to connect to Kraken API via proxy...');
      
      const serverTime = await krakenRequest<KrakenTimeResponse>(
        'public/Time', 
        userId, 
        useProxyApi, 
        false, 
        'GET'
      );
      
      console.log('Kraken server time:', new Date(serverTime.result.unixtime * 1000).toISOString());
      
      setIsConnected(true);
      
      console.log('Connected to Kraken API via Supabase Edge Function');
      toast.success('Connected to Kraken API');
      
      const { data: session } = await supabase.auth.getSession();
      if (session.session) {
        fetchTradeHistory().then(async (trades) => {
          if (trades && trades.length > 0) {
            await saveTradesToSupabase(trades);
          }
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Connection failed: ${errorMessage}`);
      setIsConnected(false);
      toast.error(`Connection failed: ${errorMessage}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [config.apiKey, config.apiSecret, userId, useProxyApi, fetchTradeHistory]);
  
  return {
    isConnected,
    isLoading,
    error,
    data,
    connect,
    sendOrder,
    fetchBalance,
    fetchOpenPositions,
    fetchTradeHistory,
    subscribeToTicker,
    unsubscribeFromTicker
  };
};

// Helper function moved from the original file
import { saveTradesToSupabase } from '@/utils/tradeHistoryDb';
