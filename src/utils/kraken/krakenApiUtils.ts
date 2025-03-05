
import { supabase } from '@/integrations/supabase/client';
import { 
  KrakenTimeResponse, 
  KrakenBalanceResponse,
  KrakenPositionsResponse,
  KrakenTradesResponse,
  KrakenOrderResponse,
  ErrorDetails,
  Position,
  Trade
} from '@/types/krakenApiTypes';
import { z } from 'zod';

// Caching mechanism
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

const apiCache: Record<string, CacheEntry<any>> = {};
const CACHE_TTL = 60000; // 1 minute cache TTL
const REQUEST_SIZE_LIMIT = 1024 * 1024; // 1MB
const MAX_REQUESTS_PER_MINUTE = 60;

// Request counter for rate limiting
let requestCounts: { [key: string]: { count: number, resetTime: number } } = {};

// Request validation schemas using Zod
const orderParamsSchema = z.object({
  pair: z.string().min(1),
  type: z.enum(['buy', 'sell']),
  ordertype: z.enum(['market', 'limit']),
  volume: z.string().regex(/^\d*\.?\d+$/),
  price: z.string().regex(/^\d*\.?\d+$/).optional(),
});

// Function to validate request size
const validateRequestSize = (data: any): boolean => {
  const size = new TextEncoder().encode(JSON.stringify(data)).length;
  return size <= REQUEST_SIZE_LIMIT;
};

// Function to implement rate limiting
const checkRateLimit = (userId: string): { allowed: boolean, reason?: string } => {
  const now = Date.now();
  const minuteKey = `${userId}_minute`;
  
  // Initialize or reset counters if needed
  if (!requestCounts[minuteKey] || requestCounts[minuteKey].resetTime < now) {
    requestCounts[minuteKey] = { count: 0, resetTime: now + 60000 };
  }
  
  // Increment and check
  requestCounts[minuteKey].count++;
  
  if (requestCounts[minuteKey].count > MAX_REQUESTS_PER_MINUTE) {
    return { allowed: false, reason: 'Rate limit exceeded. Please try again later.' };
  }
  
  return { allowed: true };
};

// Enhanced error handler that creates structured error objects
const createErrorDetails = (
  error: any, 
  endpoint: string, 
  httpStatus?: number
): ErrorDetails => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Map common error patterns to error codes
  let errorCode = 'UNKNOWN_ERROR';
  
  if (errorMessage.includes('Unauthorized')) {
    errorCode = 'UNAUTHORIZED';
  } else if (errorMessage.includes('Rate limit')) {
    errorCode = 'RATE_LIMIT_EXCEEDED';
  } else if (errorMessage.includes('Invalid nonce')) {
    errorCode = 'INVALID_NONCE';
  } else if (errorMessage.includes('Invalid key')) {
    errorCode = 'INVALID_API_KEY';
  } else if (errorMessage.includes('Invalid signature')) {
    errorCode = 'INVALID_SIGNATURE';
  } else if (errorMessage.includes('Service unavailable')) {
    errorCode = 'SERVICE_UNAVAILABLE';
  } else if (errorMessage.includes('timeout')) {
    errorCode = 'REQUEST_TIMEOUT';
  }
  
  return {
    code: errorCode,
    message: errorMessage,
    httpStatus,
    timestamp: new Date().toISOString(),
    endpoint
  };
};

// More realistic mock responses with edge cases
export const getMockResponse = <T>(endpoint: string, data: any): T => {
  // Add some randomized delay for realistic simulation
  const simulateDelay = Math.random() < 0.3;
  if (simulateDelay) {
    // Simulate occasional slow responses
    console.log('Simulating slow response for demo mode');
  }
  
  // Randomly simulate errors (10% chance)
  const simulateError = Math.random() < 0.1;
  if (simulateError && !endpoint.includes('Time')) {
    console.log('Simulating API error for demo mode');
    return {
      error: ['EGeneral:Mock error for testing purposes']
    } as unknown as T;
  }
  
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
        'ZUSD': (10000 + Math.random() * 500).toFixed(4), 
        'XXBT': (1.5 + Math.random() * 0.2).toFixed(6),
        'XETH': (25.0 + Math.random() * 2).toFixed(6)
      }
    } as unknown as T;
  } else if (endpoint === 'private/OpenPositions') {
    // Return empty positions 70% of the time, some positions 30% of the time
    if (Math.random() < 0.7) {
      return { result: {} } as unknown as T;
    }
    
    return { 
      result: {
        'ABCDEF-GHIJK-LMNOPQ': {
          pair: 'XXBTZUSD',
          type: Math.random() > 0.5 ? 'buy' : 'sell',
          vol: (0.1 + Math.random() * 0.3).toFixed(6),
          cost: (3500 + Math.random() * 500).toFixed(2),
          fee: (10 + Math.random() * 5).toFixed(2),
          margin: (1750 + Math.random() * 250).toFixed(2),
          value: (3600 + Math.random() * 500).toFixed(2),
          net: (Math.random() > 0.5 ? 1 : -1 * (Math.random() * 100)).toFixed(2),
          leverage: '2:1'
        }
      }
    } as unknown as T;
  } else if (endpoint === 'private/TradesHistory') {
    return {
      result: {
        trades: {
          'TXID1': {
            pair: 'XXBTZUSD',
            type: 'buy',
            ordertype: 'market',
            price: '37500.0',
            vol: '0.1',
            cost: '3750.0',
            fee: '7.5',
            time: Math.floor(Date.now()/1000) - 86400
          },
          'TXID2': {
            pair: 'XXBTZUSD',
            type: 'sell',
            ordertype: 'limit',
            price: '38200.0',
            vol: '0.05',
            cost: '1910.0',
            fee: '3.8',
            time: Math.floor(Date.now()/1000) - 43200
          }
        },
        count: 2
      }
    } as unknown as T;
  } else if (endpoint === 'private/AddOrder') {
    return {
      result: {
        descr: { order: `${data.type} ${data.volume} ${data.pair} @ ${data.ordertype}` },
        txid: ['MOCKORDER-' + Math.random().toString(36).substring(2, 10)]
      }
    } as unknown as T;
  }
  
  return { result: {} } as unknown as T;
};

// Improved proxy request with caching, validation and error handling
export const proxyRequest = async <T>(
  path: string, 
  userId: string | null,
  isPrivate: boolean = false, 
  method: 'GET' | 'POST' = 'POST',
  data: any = {}
): Promise<T> => {
  try {
    console.log(`Sending request to Kraken-proxy with path: ${path}, method: ${method}, isPrivate: ${isPrivate}`);
    
    // Validate request size
    if (!validateRequestSize(data)) {
      throw new Error('Request payload too large');
    }
    
    // Check cache for non-private requests or read-only private requests
    const cacheKey = `${path}_${JSON.stringify(data)}_${userId}`;
    const isReadOnly = method === 'GET' || (path.includes('Balance') || path.includes('Positions') || path.includes('History'));
    
    if (apiCache[cacheKey] && apiCache[cacheKey].expiresAt > Date.now() && isReadOnly) {
      console.log(`Using cached response for ${path}`);
      return apiCache[cacheKey].data;
    }
    
    // Apply rate limiting for private endpoints
    if (isPrivate && userId) {
      const rateLimit = checkRateLimit(userId);
      if (!rateLimit.allowed) {
        throw new Error(`Rate limit exceeded: ${rateLimit.reason}`);
      }
    }
    
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

    // Check for Kraken API errors
    if (responseData && responseData.error && responseData.error.length > 0) {
      throw new Error(`Kraken API Error: ${responseData.error.join(', ')}`);
    }

    console.log(`Proxy response for ${path}:`, responseData);
    
    // Cache successful responses
    if (isReadOnly) {
      apiCache[cacheKey] = {
        data: responseData,
        timestamp: Date.now(),
        expiresAt: Date.now() + CACHE_TTL
      };
    }
    
    return responseData as T;
  } catch (err) {
    console.error(`Proxy request to ${path} failed:`, err);
    throw err;
  }
};

// Clear cache on specific events
export const clearApiCache = (pattern?: string): void => {
  if (pattern) {
    Object.keys(apiCache).forEach(key => {
      if (key.includes(pattern)) {
        delete apiCache[key];
      }
    });
  } else {
    Object.keys(apiCache).forEach(key => {
      delete apiCache[key];
    });
  }
  
  console.log(`API cache ${pattern ? 'partially' : 'fully'} cleared`);
};

// Main function to make Kraken API requests with improved error handling
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
    
    // Validate input data for specific endpoints
    if (endpoint === 'private/AddOrder') {
      const validationResult = orderParamsSchema.safeParse(data);
      if (!validationResult.success) {
        throw new Error(`Invalid order parameters: ${JSON.stringify(validationResult.error.format())}`);
      }
    }
    
    if (useProxyApi) {
      return await proxyRequest<T>(endpoint, userId, isPrivate, method, data);
    }
    
    return getMockResponse<T>(endpoint, data);
  } catch (err) {
    const errorDetails = createErrorDetails(err, endpoint);
    console.error(`Kraken API request failed (${endpoint}):`, errorDetails);
    throw err;
  }
};

// Function to process balance data from Kraken with validation
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
      // Validate that the value is a valid number
      const numValue = parseFloat(value as string);
      if (isNaN(numValue)) {
        console.warn(`Invalid balance value for ${asset}: ${value}`);
        return;
      }
      processedBalance[normalizedAsset] = numValue;
    }
  });
  
  return processedBalance;
};

// Function to process positions data from Kraken with validation
export const processPositionsData = (positionsData: KrakenPositionsResponse): Position[] => {
  if (!positionsData || !positionsData.result) {
    throw new Error('Invalid response from Kraken API');
  }
  
  return Object.entries(positionsData.result).map(([id, position]) => {
    // Validate numeric fields
    const volume = parseFloat(position.vol);
    const cost = parseFloat(position.cost);
    const fee = parseFloat(position.fee);
    const margin = parseFloat(position.margin);
    const value = parseFloat(position.value);
    const pnl = parseFloat(position.net);
    
    // Check for invalid values
    if (isNaN(volume) || isNaN(cost) || isNaN(fee) || isNaN(margin) || isNaN(value) || isNaN(pnl)) {
      console.warn(`Invalid position data for ID ${id}:`, position);
    }
    
    return {
      id,
      pair: position.pair,
      type: position.type,
      volume: isNaN(volume) ? 0 : volume,
      cost: isNaN(cost) ? 0 : cost,
      fee: isNaN(fee) ? 0 : fee,
      entryPrice: isNaN(margin) ? 0 : margin,
      currentPrice: isNaN(value) ? 0 : value,
      pnl: isNaN(pnl) ? 0 : pnl,
      leverage: position.leverage,
      status: position.status
    };
  });
};

// Function to process trades data from Kraken with validation
export const processTradesData = (tradesData: KrakenTradesResponse): Trade[] => {
  if (!tradesData || !tradesData.result || !tradesData.result.trades) {
    return [];
  }
  
  return Object.entries(tradesData.result.trades).map(([id, trade]) => {
    // Validate numeric fields
    const price = parseFloat(trade.price);
    const volume = parseFloat(trade.vol);
    const cost = parseFloat(trade.cost);
    const fee = parseFloat(trade.fee);
    
    // Check for invalid values
    if (isNaN(price) || isNaN(volume) || isNaN(cost) || isNaN(fee)) {
      console.warn(`Invalid trade data for ID ${id}:`, trade);
    }
    
    return {
      id,
      pair: trade.pair,
      type: trade.type,
      price: isNaN(price) ? 0 : price,
      volume: isNaN(volume) ? 0 : volume,
      time: new Date(trade.time * 1000).toISOString(),
      orderType: trade.ordertype,
      cost: isNaN(cost) ? 0 : cost,
      fee: isNaN(fee) ? 0 : fee
    };
  });
};

// Function to validate and sanitize input data
export const validateAndSanitize = <T>(data: any, schema: z.ZodType<T>): { valid: boolean; data?: T; errors?: string[] } => {
  try {
    const result = schema.safeParse(data);
    if (result.success) {
      return { valid: true, data: result.data };
    } else {
      return { 
        valid: false, 
        errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      };
    }
  } catch (error) {
    return { 
      valid: false, 
      errors: [(error instanceof Error) ? error.message : 'Unknown validation error']
    };
  }
};
