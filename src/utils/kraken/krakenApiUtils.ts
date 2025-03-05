
import { supabase } from '@/integrations/supabase/client';
import { getConnectionStatus } from '@/utils/websocketManager';

/**
 * Makes a request to the Kraken API through our proxy
 */
export const krakenRequest = async <T>(
  endpoint: string,
  userId: string | null,
  useProxyApi: boolean = true,
  isPrivate: boolean = true,
  method: 'GET' | 'POST' = 'POST',
  data: any = {}
): Promise<T> => {
  try {
    console.log(`Making request to ${endpoint} (${isPrivate ? 'private' : 'public'})`);

    // Get WebSocket status to check demo mode
    const { isDemoMode } = getConnectionStatus();
    
    // If it's a private endpoint, we need a userId
    if (isPrivate && !userId && !isDemoMode) {
      console.warn(`Private endpoint ${endpoint} requested without userId`);
      throw new Error('User authentication required for private endpoints');
    }
    
    // Use proxy API
    const { data: responseData, error } = await supabase.functions.invoke('kraken-proxy', {
      body: {
        path: endpoint,
        method,
        isPrivate,
        data,
        userId,
        forceDemoMode: isDemoMode
      }
    });
    
    if (error) {
      console.error('Error calling Kraken API proxy:', error);
      throw new Error(`Proxy error: ${error.message}`);
    }
    
    return responseData as T;
  } catch (error) {
    console.error(`Error in API request to ${endpoint}:`, error);
    throw error;
  }
};

/**
 * Process balance data from Kraken API response
 */
export const processBalanceData = (balanceData: any): Record<string, number> => {
  if (!balanceData || !balanceData.result) {
    return { USD: 0, BTC: 0, ETH: 0 }; // Default values
  }
  
  const result = balanceData.result;
  
  // Map Kraken's asset codes to more readable formats
  return {
    USD: parseFloat(result.ZUSD || 0),
    BTC: parseFloat(result.XXBT || 0),
    ETH: parseFloat(result.XETH || 0),
    // Add more assets as needed
  };
};

/**
 * Process open positions data from Kraken API response
 */
export const processPositionsData = (positionsData: any): any[] => {
  if (!positionsData || !positionsData.result) {
    return []; // Default empty array
  }
  
  const result = positionsData.result;
  
  // Convert object of positions to array
  return Object.entries(result).map(([id, position]: [string, any]) => ({
    id,
    pair: position.pair?.replace('XX', '').replace('ZU', '') || 'BTC/USD',
    type: position.type || 'buy',
    volume: parseFloat(position.vol || 0),
    cost: parseFloat(position.cost || 0),
    value: parseFloat(position.value || 0),
    profit: parseFloat(position.net || 0),
    leverage: position.leverage || '1:1',
    openTime: position.time || Date.now()/1000
  }));
};

/**
 * Process trade history data from Kraken API response
 */
export const processTradesData = (tradesData: any): any[] => {
  if (!tradesData || !tradesData.result?.trades) {
    return []; // Default empty array
  }
  
  const trades = tradesData.result.trades;
  
  // Convert object of trades to array
  return Object.entries(trades).map(([id, trade]: [string, any]) => ({
    id,
    pair: trade.pair?.replace('XX', '').replace('ZU', '') || 'BTC/USD',
    type: trade.type || 'buy',
    orderType: trade.ordertype || 'market',
    price: parseFloat(trade.price || 0),
    volume: parseFloat(trade.vol || 0),
    cost: parseFloat(trade.cost || 0),
    fee: parseFloat(trade.fee || 0),
    time: trade.time || Date.now()/1000
  }))
  .sort((a, b) => b.time - a.time); // Sort by time, newest first
};
