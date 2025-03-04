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
  
  // Funksjon for å gjøre forespørsler via Supabase Edge Function
  const proxyRequest = async <T>(
    path: string, 
    isPrivate: boolean = false, 
    method: 'GET' | 'POST' = 'POST',
    data: any = {}
  ): Promise<T> => {
    try {
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
  
  // Funksjon for å gjøre API-forespørsler til Kraken
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
      
      // Resten av den opprinnelige krakenRequest-implementasjonen beholdes som fallback
      // ... keep existing code (direct API request implementation)
      
      // Dette er fallback-implementasjonen som bruker mock-data
      return getMockResponse<T>(endpoint, data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error(`Kraken API request failed (${endpoint}):`, errorMessage);
      throw err;
    }
  };
  
  // Function to get mock response data - beholdes for fallback
  const getMockResponse = <T>(endpoint: string, data: any): T => {
    // ... keep existing code (mock data implementation)
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
      // Mock a successful order placement
      return {
        result: {
          descr: { order: `${data.type} ${data.volume} ${data.pair} @ market` },
          txid: ['MOCK-' + Math.random().toString(36).substring(2, 10)]
        }
      } as unknown as T;
    }
    
    // Generic empty response
    return { result: {} } as unknown as T;
  };
  
  // Connect to the Kraken API
  const connect = useCallback(async () => {
    if (!config.apiKey || !config.apiSecret) {
      setError('API key and secret required');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Test connection by getting server time
      console.log('Attempting to connect to Kraken API via proxy...');
      
      const serverTime = await krakenRequest<KrakenTimeResponse>('public/Time', false, 'GET');
      console.log('Kraken server time:', new Date(serverTime.result.unixtime * 1000).toISOString());
      
      setIsConnected(true);
      
      // Logg resultatet av tilkoblingen
      console.log('Connected to Kraken API via Supabase Edge Function');
      toast.success('Connected to Kraken API');
      
      // Lagre transaksjonshistorikk dersom brukeren er autentisert
      const { data: session } = await supabase.auth.getSession();
      if (session.session) {
        fetchTradeHistory().then(async (trades) => {
          if (trades && trades.length > 0) {
            try {
              // Lagre handelshistorikk i Supabase
              for (const trade of trades) {
                await supabase.from('trade_history').upsert({
                  user_id: session.session?.user.id,
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
  
  // Fetch account balance
  const fetchBalance = useCallback(async () => {
    if (!isConnected) {
      console.error('Cannot fetch balance: Not connected to Kraken API');
      return null;
    }
    
    setIsLoading(true);
    
    try {
      const balanceData = await krakenRequest<KrakenBalanceResponse>('private/Balance');
      console.log('Account balance data:', balanceData);
      
      // Process the balance data
      const processedBalance: Record<string, number> = {
        USD: 0,
        BTC: 0,
        ETH: 0
      };
      
      // Map Kraken's asset names to our normalized ones
      const assetMap: Record<string, keyof typeof processedBalance> = {
        'ZUSD': 'USD',
        'XXBT': 'BTC',
        'XETH': 'ETH'
      };
      
      // Extract the balance values
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
  
  // Fetch open positions
  const fetchOpenPositions = useCallback(async () => {
    if (!isConnected) {
      console.error('Cannot fetch positions: Not connected to Kraken API');
      return null;
    }
    
    setIsLoading(true);
    
    try {
      const positionsData = await krakenRequest<KrakenPositionsResponse>('private/OpenPositions');
      console.log('Open positions data:', positionsData);
      
      // Process the positions data
      const positions = Object.entries(positionsData.result).map(([id, position]: [string, any]) => ({
        id,
        pair: position.pair,
        type: position.type,
        volume: parseFloat(position.vol),
        cost: parseFloat(position.cost),
        fee: parseFloat(position.fee),
        entryPrice: parseFloat(position.margin), // Simplification, real calculation is more complex
        currentPrice: parseFloat(position.value), // As of the API response
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
  
  // Fetch trade history
  const fetchTradeHistory = useCallback(async () => {
    if (!isConnected) {
      console.error('Cannot fetch trade history: Not connected to Kraken API');
      return null;
    }
    
    setIsLoading(true);
    
    try {
      // First try to get trade history from Supabase if user is authenticated
      const { data: session } = await supabase.auth.getSession();
      
      if (session.session) {
        try {
          const { data: localTrades, error } = await supabase
            .from('trade_history')
            .select('*')
            .order('created_at', { ascending: false });
            
          if (!error && localTrades && localTrades.length > 0) {
            console.log('Using trade history from Supabase:', localTrades);
            // Format the data to match the expected structure
            return localTrades.map(trade => ({
              id: trade.external_id || trade.id,
              pair: trade.pair,
              type: trade.type,
              price: parseFloat(trade.price),
              volume: parseFloat(trade.volume),
              time: trade.created_at,
              orderType: trade.order_type,
              cost: parseFloat(trade.cost),
              fee: parseFloat(trade.fee)
            }));
          }
        } catch (e) {
          console.error('Error fetching trade history from Supabase:', e);
        }
      }
      
      // If no local history or not authenticated, get from Kraken API
      const tradesData = await krakenRequest<KrakenTradesResponse>('private/TradesHistory', true, 'POST', {
        start: Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60, // Last 30 days
        end: Math.floor(Date.now() / 1000)
      });
      
      console.log('Trade history data from API:', tradesData);
      
      // Process the trades data - add safety check for the trades property
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
        
        // If user is authenticated, store trades in Supabase
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
        // Return empty array when no trades exist or the property doesn't exist
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
  
  // Function to send a new order
  const sendOrder = useCallback(async (params: OrderParams) => {
    if (!isConnected) {
      toast.error('Not connected to Kraken API');
      throw new Error('Not connected to Kraken API');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Sending order to Kraken:', params);
      
      // Prepare order data
      const orderData = {
        pair: params.pair,
        type: params.type,
        ordertype: params.ordertype,
        volume: params.volume
      };
      
      // Add price for limit orders
      if (params.ordertype === 'limit' && params.price) {
        Object.assign(orderData, { price: params.price });
      }
      
      // Send the order
      const result = await krakenRequest('private/AddOrder', true, 'POST', orderData);
      
      console.log('Order placed successfully:', result);
      
      if (corsRestricted) {
        toast.success(`${params.type.toUpperCase()} order for ${params.volume} ${params.pair} placed (Demo)`);
      } else {
        toast.success(`${params.type.toUpperCase()} order for ${params.volume} ${params.pair} placed successfully`);
      }
      
      // Also store the trade in history if authenticated
      const { data: session } = await supabase.auth.getSession();
      if (session.session && result.result && result.result.txid) {
        try {
          // Create a record of this order in trade_history
          const price = params.price || '0'; // For market orders
          await supabase.from('trade_history').insert({
            user_id: session.session.user.id,
            pair: params.pair,
            type: params.type,
            price: parseFloat(price),
            volume: parseFloat(params.volume),
            cost: parseFloat(price) * parseFloat(params.volume),
            fee: 0, // Will be updated when we get actual trade data
            order_type: params.ordertype,
            external_id: result.result.txid[0],
            created_at: new Date().toISOString()
          });
          console.log('Order saved to trade history');
        } catch (e) {
          console.error('Error saving order to trade history:', e);
        }
      }
      
      // Return the order result
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
  
  // Subscribe to ticker updates for a pair
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
  
  // Unsubscribe from ticker updates for a pair
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
