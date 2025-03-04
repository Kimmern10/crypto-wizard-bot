
import { useState, useEffect, useCallback } from 'react';
import { getKrakenWebSocket, WebSocketMessage } from '@/utils/websocketManager';
import { toast } from 'sonner';

interface KrakenApiConfig {
  apiKey: string;
  apiSecret: string;
}

interface KrakenApiResponse {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  data: any;
  sendOrder: (params: OrderParams) => Promise<void>;
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

export const useKrakenApi = (config: KrakenApiConfig): KrakenApiResponse => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  
  // Initialize WebSocket connection
  useEffect(() => {
    if (!config.apiKey || !config.apiSecret) {
      setIsConnected(false);
      return;
    }
    
    const ws = getKrakenWebSocket();
    
    const connectWs = async () => {
      try {
        await ws.connect();
        setIsConnected(true);
        
        // Setup message handler
        const unsubscribe = ws.subscribe((message: WebSocketMessage) => {
          // Process incoming websocket messages
          if (message.type === 'ticker') {
            setData(prevData => ({
              ...prevData,
              ticker: {
                ...prevData?.ticker,
                [message.data.pair]: message.data
              }
            }));
          }
        });
        
        return unsubscribe;
      } catch (err) {
        console.error('Failed to connect to Kraken WebSocket:', err);
        setError('Failed to connect to Kraken API');
        setIsConnected(false);
        return () => {};
      }
    };
    
    const unsubscribe = connectWs();
    
    return () => {
      // Cleanup WebSocket subscription
      unsubscribe.then(unsub => unsub());
    };
  }, [config.apiKey, config.apiSecret]);
  
  // Function to send a new order
  const sendOrder = useCallback(async (params: OrderParams) => {
    if (!isConnected) {
      toast.error('Not connected to Kraken API');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real implementation, this would make an API call to Kraken
      // For demonstration, we simulate a response
      console.log('Sending order to Kraken:', params);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate successful response
      toast.success(`${params.type.toUpperCase()} order for ${params.volume} ${params.pair} placed successfully`);
      
      // Update local data (mock)
      setData(prevData => ({
        ...prevData,
        orders: [
          ...(prevData?.orders || []),
          {
            id: `order-${Date.now()}`,
            ...params,
            status: 'pending',
            timestamp: new Date().toISOString()
          }
        ]
      }));
    } catch (err) {
      console.error('Error sending order:', err);
      setError('Failed to place order');
      toast.error('Failed to place order');
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
  }, [isConnected]);
  
  return {
    isConnected,
    isLoading,
    error,
    data,
    sendOrder,
    subscribeToTicker,
    unsubscribeFromTicker
  };
};
