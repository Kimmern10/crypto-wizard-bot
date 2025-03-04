import { useState, useEffect, useCallback } from 'react';
import { getKrakenWebSocket, WebSocketMessage } from '@/utils/websocketManager';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface KrakenApiConfig {
  apiKey: string;
  apiSecret: string;
}

interface KrakenApiResponse {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  data: any;
  connect: () => Promise<void>;
  sendOrder: (params: OrderParams) => Promise<any>;
  fetchBalance: () => Promise<Record<string, number> | null>;
  fetchOpenPositions: () => Promise<any[] | null>;
  fetchTradeHistory: () => Promise<any[] | null>;
  subscribeToTicker: (pair: string) => void;
  unsubscribeFromTicker: (pair: string) => void;
}

interface OrderParams {
  pair: string;
  type: 'buy' | 'sell';
  ordertype: 'market' | 'limit';
  volume: string;
  price?: string;
}

// Types for Kraken API responses
interface KrakenTimeResponse {
  result: {
    unixtime: number;
    rfc1123: string;
  };
}

interface KrakenBalanceResponse {
  result: Record<string, string>;
}

interface KrakenPositionsResponse {
  result: Record<string, any>;
}

interface KrakenTradesResponse {
  result: {
    trades: Record<string, any>;
    count: number;
  };
}

interface KrakenOrderResponse {
  result: {
    descr: { order: string };
    txid: string[];
  };
}

export const useKrakenApi = (config: KrakenApiConfig): KrakenApiResponse => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [corsRestricted, setCorsRestricted] = useState(false);
  const [useProxyApi, setUseProxyApi] = useState(true);
  
  useEffect(() => {
    setUseProxyApi(true);
  }, []);
  
  const proxyRequest = async <T>(
    path: string, 
    isPrivate: boolean = false, 
    method: 'GET' | 'POST' = 'POST',
    data: any = {}
  ): Promise<T> => {
    try {
      console.log(`Sending request to Kraken-proxy with path: ${path}, method: ${method}, isPrivate: ${isPrivate}`);
      const { data: responseData, error } = await supabase.functions.invoke('kraken-proxy', {
        body: {
          path,
          method,
          isPrivate,
          data,
          apiKey: isPrivate ? config.apiKey : undefined,
          apiSecret: isPrivate ? config.apiSecret : undefined
        }
      });

      if (error) {
        console.error('Proxy request failed:', error);
        throw new Error(error.message || 'Unknown error');
      }

      console.log(`Proxy response for ${path}:`, responseData);
      return responseData as T;
    } catch (err) {
      console.error(`Proxy request to ${path} failed:`, err);
      throw err;
    }
  };
  
  const krakenRequest = async <T>(
    endpoint: string, 
    isPrivate: boolean = true, 
    method: 'GET' | 'POST' = 'POST',
    data: any = {}
  ): Promise<T> => {
    try {
      if (isPrivate && !config.apiKey) {
        throw new Error('API key not provided');
      }
      
      if (useProxyApi) {
        return await proxyRequest<T>(endpoint, isPrivate, method, data);
      }
      
      return getMockResponse<T>(endpoint, data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error(`Kraken API request failed (${endpoint}):`, errorMessage);
      throw err;
    }
  };
  
  const getMockResponse = <T>(endpoint: string, data: any): T => {
    if (endpoint === 'public/Time') {
      return {
        result: {
          unixtime: Math.floor(Date.now() / 1000),
          rfc1123: new Date().toUTCString()
        }
      } as unknown as T;
    } else if (endpoint === 'private/Balance') {
      return {
        result: {
          'ZUSD': '10000.0000', 
          'XXBT': '1.5000',
          'XETH': '25.0000'
        }
      } as unknown as T;
    } else if (endpoint === 'private/OpenPositions') {
      return { result: {} } as unknown as T;
    } else if (endpoint === 'private/TradesHistory') {
      return {
        result: {
          trades: {},
          count: 0
        }
      } as unknown as T;
    } else if (endpoint === 'private/AddOrder') {
      return {
        result: {
          descr: { order: `${data.type} ${data.volume} ${data.pair} @ market` },
          txid: ['MOCK-' + Math.random().toString(36).substring(2, 10)]
        }
      } as unknown as T;
    }
    
    return { result: {} } as unknown as T;
  };
  
  const connect = useCallback(async () => {
    if (!config.apiKey || !config.apiSecret) {
      setError('API key and secret required');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Attempting to connect to Kraken API via proxy...');
      
      const serverTime = await krakenRequest<KrakenTimeResponse>('public/Time', false, 'GET');
      console.log('Kraken server time:', new Date(serverTime.result.unixtime * 1000).toISOString());
      
      setIsConnected(true);
      
      console.log('Connected to Kraken API via Supabase Edge Function');
      toast.success('Connected to Kraken API');
      
      const { data: session } = await supabase.auth.getSession();
      if (session.session) {
        fetchTradeHistory().then(async (trades) => {
          if (trades && trades.length > 0) {
            try {
              for (const trade of trades) {
                await supabase.from('trade_history').upsert({
                  user_id: session.session!.user.id,
                  pair: trade.pair,
                  type: trade.type,
                  price: trade.price,
                  volume: trade.volume,
                  cost: trade.cost,
                  fee: trade.fee,
                  order_type: trade.orderType,
                  external_id: trade.id,
                  created_at: new Date(trade.time).toISOString()
                }, { onConflict: 'external_id' });
              }
              console.log('Trade history synchronized with Supabase');
            } catch (error) {
              console.error('Failed to synchronize trade history with Supabase:', error);
            }
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
  }, [config.apiKey, config.apiSecret]);
  
  const fetchBalance = useCallback(async () => {
    if (!isConnected) {
      console.error('Cannot fetch balance: Not connected to Kraken API');
      return null;
    }
    
    setIsLoading(true);
    
    try {
      const balanceData = await krakenRequest<KrakenBalanceResponse>('private/Balance');
      console.log('Account balance data:', balanceData);
      
      if (!balanceData || !balanceData.result) {
        throw new Error('Invalid response from Kraken API');
      }
      
      const processedBalance: Record<string, number> = {
        USD: 0,
        BTC: 0,
        ETH: 0
      };
      
      const assetMap: Record<string, keyof typeof processedBalance> = {
        'ZUSD': 'USD',
        'XXBT': 'BTC',
        'XETH': 'ETH'
      };
      
      Object.entries(balanceData.result).forEach(([asset, value]) => {
        const normalizedAsset = assetMap[asset] || asset;
        if (processedBalance.hasOwnProperty(normalizedAsset)) {
          processedBalance[normalizedAsset] = parseFloat(value as string);
        }
      });
      
      return processedBalance;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to fetch balance:', errorMessage);
      toast.error(`Failed to fetch balance: ${errorMessage}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);
  
  const fetchOpenPositions = useCallback(async () => {
    if (!isConnected) {
      console.error('Cannot fetch positions: Not connected to Kraken API');
      return null;
    }
    
    setIsLoading(true);
    
    try {
      const positionsData = await krakenRequest<KrakenPositionsResponse>('private/OpenPositions');
      console.log('Open positions data:', positionsData);
      
      if (!positionsData || !positionsData.result) {
        throw new Error('Invalid response from Kraken API');
      }
      
      const positions = Object.entries(positionsData.result).map(([id, position]: [string, any]) => ({
        id,
        pair: position.pair,
        type: position.type,
        volume: parseFloat(position.vol),
        cost: parseFloat(position.cost),
        fee: parseFloat(position.fee),
        entryPrice: parseFloat(position.margin),
        currentPrice: parseFloat(position.value),
        pnl: parseFloat(position.net),
        leverage: position.leverage
      }));
      
      return positions;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to fetch open positions:', errorMessage);
      toast.error(`Failed to fetch open positions: ${errorMessage}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);
  
  const fetchTradeHistory = useCallback(async () => {
    if (!isConnected) {
      console.error('Cannot fetch trade history: Not connected to Kraken API');
      return null;
    }
    
    setIsLoading(true);
    
    try {
      const { data: session } = await supabase.auth.getSession();
      
      if (session.session) {
        try {
          const { data: localTrades, error } = await supabase
            .from('trade_history')
            .select('*')
            .order('created_at', { ascending: false });
            
          if (!error && localTrades && localTrades.length > 0) {
            console.log('Using trade history from Supabase:', localTrades);
            return localTrades.map(trade => ({
              id: trade.external_id || trade.id,
              pair: trade.pair,
              type: trade.type,
              price: parseFloat(trade.price.toString()),
              volume: parseFloat(trade.volume.toString()),
              time: trade.created_at,
              orderType: trade.order_type,
              cost: parseFloat(trade.cost.toString()),
              fee: parseFloat(trade.fee.toString())
            }));
          }
        } catch (e) {
          console.error('Error fetching trade history from Supabase:', e);
        }
      }
      
      const tradesData = await krakenRequest<KrakenTradesResponse>('private/TradesHistory', true, 'POST', {
        start: Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60,
        end: Math.floor(Date.now() / 1000)
      });
      
      console.log('Trade history data from API:', tradesData);
      
      if (!tradesData || !tradesData.result) {
        throw new Error('Invalid response from Kraken API');
      }
      
      if (tradesData && tradesData.result && tradesData.result.trades) {
        const trades = Object.entries(tradesData.result.trades).map(([id, trade]: [string, any]) => ({
          id,
          pair: trade.pair,
          type: trade.type,
          price: parseFloat(trade.price),
          volume: parseFloat(trade.vol),
          time: new Date(trade.time * 1000).toISOString(),
          orderType: trade.ordertype,
          cost: parseFloat(trade.cost),
          fee: parseFloat(trade.fee)
        }));
        
        if (session.session) {
          try {
            for (const trade of trades) {
              await supabase.from('trade_history').upsert({
                user_id: session.session.user.id,
                pair: trade.pair,
                type: trade.type,
                price: trade.price,
                volume: trade.volume,
                cost: trade.cost,
                fee: trade.fee,
                order_type: trade.orderType,
                external_id: trade.id,
                created_at: trade.time
              }, { onConflict: 'external_id' });
            }
            console.log('Trade history saved to Supabase');
          } catch (e) {
            console.error('Error saving trade history to Supabase:', e);
          }
        }
        
        return trades;
      } else {
        console.log('No trade history found or unexpected response format');
        return [];
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to fetch trade history:', errorMessage);
      toast.error(`Failed to fetch trade history: ${errorMessage}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);
  
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
      
      const result = await krakenRequest<KrakenOrderResponse>('private/AddOrder', true, 'POST', orderData);
      
      console.log('Order placed successfully:', result);
      
      if (corsRestricted) {
        toast.success(`${params.type.toUpperCase()} order for ${params.volume} ${params.pair} placed (Demo)`);
      } else {
        toast.success(`${params.type.toUpperCase()} order for ${params.volume} ${params.pair} placed successfully`);
      }
      
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid response format from Kraken API');
      }
      
      const { data: session } = await supabase.auth.getSession();
      if (session.session && result.result && Array.isArray(result.result.txid) && result.result.txid.length > 0) {
        try {
          const price = params.price || '0';
          await supabase.from('trade_history').insert({
            user_id: session.session.user.id,
            pair: params.pair,
            type: params.type,
            price: price,
            volume: params.volume,
            cost: (parseFloat(price) * parseFloat(params.volume)).toString(),
            fee: '0',
            order_type: params.ordertype,
            external_id: result.result.txid[0],
            created_at: new Date().toISOString()
          });
          console.log('Order saved to trade history');
        } catch (e) {
          console.error('Error saving order to trade history:', e);
        }
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
  }, [isConnected, corsRestricted]);
  
  const subscribeToTicker = useCallback((pair: string) => {
    if (!isConnected) {
      return;
    }
    
    const ws = getKrakenWebSocket();
    ws.send({
      method: 'subscribe',
      params: {
        name: 'ticker',
        pair: [pair]
      }
    });
    
    console.log(`Subscribed to ticker updates for ${pair}`);
  }, [isConnected]);
  
  const unsubscribeFromTicker = useCallback((pair: string) => {
    if (!isConnected) {
      return;
    }
    
    const ws = getKrakenWebSocket();
    ws.send({
      method: 'unsubscribe',
      params: {
        name: 'ticker',
        pair: [pair]
      }
    });
    
    console.log(`Unsubscribed from ticker updates for ${pair}`);
  }, [isConnected]);
  
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
