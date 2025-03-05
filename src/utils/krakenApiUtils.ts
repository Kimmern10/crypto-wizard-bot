
import { supabase } from '@/integrations/supabase/client';
import { 
  KrakenTimeResponse, 
  KrakenBalanceResponse,
  KrakenPositionsResponse,
  KrakenTradesResponse,
  KrakenOrderResponse
} from '@/types/krakenApiTypes';

// Mock responses for development or when API is unavailable
export const getMockResponse = <T>(endpoint: string, data: any): T => {
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

// Function to make requests to the Kraken API via our Supabase Edge Function
export const proxyRequest = async <T>(
  path: string, 
  userId: string | null,
  isPrivate: boolean = false, 
  method: 'GET' | 'POST' = 'POST',
  data: any = {}
): Promise<T> => {
  try {
    console.log(`Sending request to Kraken-proxy with path: ${path}, method: ${method}, isPrivate: ${isPrivate}`);
    
    const requestBody = {
      path,
      method,
      isPrivate,
      data,
      userId: isPrivate ? userId : undefined
    };
    
    const { data: responseData, error } = await supabase.functions.invoke('kraken-proxy', {
      body: requestBody
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

// Main function to make Kraken API requests
export const krakenRequest = async <T>(
  endpoint: string,
  userId: string | null,
  useProxyApi: boolean,
  isPrivate: boolean = true, 
  method: 'GET' | 'POST' = 'POST',
  data: any = {}
): Promise<T> => {
  try {
    if (isPrivate && !userId) {
      throw new Error('User authentication required for private endpoints');
    }
    
    if (useProxyApi) {
      return await proxyRequest<T>(endpoint, userId, isPrivate, method, data);
    }
    
    return getMockResponse<T>(endpoint, data);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Kraken API request failed (${endpoint}):`, errorMessage);
    throw err;
  }
};

// Function to process balance data from Kraken
export const processBalanceData = (balanceData: KrakenBalanceResponse): Record<string, number> => {
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
};

// Function to process positions data from Kraken
export const processPositionsData = (positionsData: KrakenPositionsResponse): any[] => {
  if (!positionsData || !positionsData.result) {
    throw new Error('Invalid response from Kraken API');
  }
  
  return Object.entries(positionsData.result).map(([id, position]: [string, any]) => ({
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
};

// Function to process trades data from Kraken
export const processTradesData = (tradesData: KrakenTradesResponse): any[] => {
  if (!tradesData || !tradesData.result || !tradesData.result.trades) {
    return [];
  }
  
  return Object.entries(tradesData.result.trades).map(([id, trade]: [string, any]) => ({
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
};
