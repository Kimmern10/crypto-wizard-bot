
import { useState, useEffect, useCallback } from 'react';
import { getKrakenWebSocket, WebSocketMessage } from '@/utils/websocketManager';
import { toast } from 'sonner';
import CryptoJS from 'crypto-js';

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

// Production Kraken API endpoints
const API_URL = 'https://api.kraken.com';
const API_VERSION = '0';

export const useKrakenApi = (config: KrakenApiConfig): KrakenApiResponse => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  
  // Function to create API signature for private endpoints
  const createSignature = (path: string, nonce: string, postData: any) => {
    const apiSecret = config.apiSecret;
    
    if (!apiSecret) {
      throw new Error('API secret not provided');
    }
    
    // Decode base64 secret
    const secret = CryptoJS.enc.Base64.parse(apiSecret);
    
    // Create the message to sign
    const message = postData.nonce + postData.toString();
    
    // Create the SHA256 hash of the message
    const hash = CryptoJS.SHA256(message);
    
    // Create the HMAC-SHA512 of the hashed message using the decoded secret
    const hmac = CryptoJS.HmacSHA512(
      path + hash.toString(CryptoJS.enc.Hex),
      secret
    );
    
    // Return the base64-encoded signature
    return CryptoJS.enc.Base64.stringify(hmac);
  };
  
  // Function to make authenticated API requests to Kraken
  const krakenRequest = async (
    endpoint: string, 
    isPrivate: boolean = true, 
    method: 'GET' | 'POST' = 'POST',
    data: any = {}
  ) => {
    try {
      if (!config.apiKey && isPrivate) {
        throw new Error('API key not provided');
      }
      
      // Build the URL
      const url = `${API_URL}/${API_VERSION}/${endpoint}`;
      
      // Setup request
      const headers: HeadersInit = {
        'Content-Type': 'application/x-www-form-urlencoded'
      };
      
      let body: any;
      
      // Add authentication for private endpoints
      if (isPrivate) {
        // Create nonce for authentication
        const nonce = Date.now().toString();
        
        // Add nonce to the data
        const postData = {
          ...data,
          nonce
        };
        
        // Add API key and signature to headers
        headers['API-Key'] = config.apiKey;
        headers['API-Sign'] = createSignature(`/${API_VERSION}/${endpoint}`, nonce, postData);
        
        // Convert data to URL encoded format
        body = new URLSearchParams(postData);
      } else if (method === 'POST' && Object.keys(data).length > 0) {
        body = new URLSearchParams(data);
      }
      
      // Make the request
      const response = await fetch(url, {
        method,
        headers,
        body: method === 'POST' ? body : undefined
      });
      
      // Parse the response
      const responseData = await response.json();
      
      // Check for errors
      if (responseData.error && responseData.error.length > 0) {
        throw new Error(responseData.error.join(', '));
      }
      
      return responseData.result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error(`Kraken API request failed (${endpoint}):`, errorMessage);
      throw err;
    }
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
      const serverTime = await krakenRequest('public/Time', false, 'GET');
      console.log('Kraken server time:', new Date(serverTime.unixtime * 1000).toISOString());
      
      // If successful, set connected status
      setIsConnected(true);
      console.log('Connected to Kraken API. Ready for trading.');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Connection failed: ${errorMessage}`);
      setIsConnected(false);
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
      const balanceData = await krakenRequest('private/Balance');
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
      Object.entries(balanceData).forEach(([asset, value]) => {
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
      const positionsData = await krakenRequest('private/OpenPositions');
      console.log('Open positions data:', positionsData);
      
      // Process the positions data
      const positions = Object.entries(positionsData).map(([id, position]: [string, any]) => ({
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
      const tradesData = await krakenRequest('private/TradesHistory', true, 'POST', {
        start: Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60, // Last 30 days
        end: Math.floor(Date.now() / 1000)
      });
      
      console.log('Trade history data:', tradesData);
      
      // Process the trades data
      const trades = Object.entries(tradesData.trades).map(([id, trade]: [string, any]) => ({
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
      
      return trades;
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
      
      toast.success(`${params.type.toUpperCase()} order for ${params.volume} ${params.pair} placed successfully`);
      
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
  }, [isConnected]);
  
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
