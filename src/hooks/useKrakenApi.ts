import { useState, useEffect, useCallback } from 'react';
import { getKrakenWebSocket, getConnectionStatus } from '@/utils/websocketManager';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  KrakenApiConfig, 
  OrderParams, 
  KrakenApiResponse,
  KrakenTimeResponse,
  KrakenBalanceResponse,
  KrakenPositionsResponse,
  KrakenTradesResponse,
  KrakenOrderResponse
} from '@/types/krakenApiTypes';
import { 
  krakenRequest, 
  processBalanceData, 
  processPositionsData, 
  processTradesData 
} from '@/utils/krakenApiUtils';
import {
  fetchTradesFromSupabase,
  saveTradesToSupabase,
  saveOrderToSupabase
} from '@/utils/tradeHistoryDb';

export const useKrakenApi = (config: KrakenApiConfig): KrakenApiResponse => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [corsRestricted, setCorsRestricted] = useState(false);
  const [useProxyApi, setUseProxyApi] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  
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
  }, [config.apiKey, config.apiSecret, userId, useProxyApi]);
  
  const fetchBalance = useCallback(async () => {
    if (!isConnected) {
      console.error('Cannot fetch balance: Not connected to Kraken API');
      return null;
    }
    
    setIsLoading(true);
    
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
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, userId, useProxyApi]);
  
  const fetchOpenPositions = useCallback(async () => {
    if (!isConnected) {
      console.error('Cannot fetch positions: Not connected to Kraken API');
      return null;
    }
    
    setIsLoading(true);
    
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
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, userId, useProxyApi]);
  
  const fetchTradeHistory = useCallback(async () => {
    if (!isConnected) {
      console.error('Cannot fetch trade history: Not connected to Kraken API');
      return null;
    }
    
    setIsLoading(true);
    
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
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, userId, useProxyApi]);
  
  const sendOrder = useCallback(async (params: OrderParams) => {
    if (!isConnected) {
      toast.error('Not connected to Kraken API');
      throw new Error('Not connected to Kraken API');
    }
    
    setIsLoading(true);
    setError(null);
    
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
      setError(`Failed to place order: ${errorMessage}`);
      toast.error(`Failed to place order: ${errorMessage}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, corsRestricted, userId, useProxyApi]);
  
  const subscribeToTicker = useCallback((pair: string) => {
    // Get the true connection status including demo mode
    const { isConnected: wsConnected, isDemoMode } = getConnectionStatus();
    
    if (!wsConnected && !isDemoMode) {
      console.log(`Cannot subscribe to ${pair}: WebSocket not connected`);
      return;
    }
    
    const ws = getKrakenWebSocket();
    ws.send({
      event: "subscribe",
      pair: [pair],
      subscription: {
        name: "ticker"
      }
    });
    
    console.log(`Subscribed to ticker updates for ${pair} (Demo mode: ${isDemoMode})`);
  }, []);
  
  const unsubscribeFromTicker = useCallback((pair: string) => {
    // Get the true connection status including demo mode
    const { isConnected: wsConnected, isDemoMode } = getConnectionStatus();
    
    if (!wsConnected && !isDemoMode) {
      console.log(`Cannot unsubscribe from ${pair}: WebSocket not connected`);
      return;
    }
    
    const ws = getKrakenWebSocket();
    ws.send({
      event: "unsubscribe",
      pair: [pair],
      subscription: {
        name: "ticker"
      }
    });
    
    console.log(`Unsubscribed from ticker updates for ${pair} (Demo mode: ${isDemoMode})`);
  }, []);
  
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
