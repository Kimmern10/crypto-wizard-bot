
import { API_URL, API_VERSION, REQUEST_TIMEOUT, MAX_RETRIES, RETRY_DELAY, DEMO_MODE_CONFIG } from "../config/apiConfig.ts";
import { corsHeaders } from "../utils/corsHeaders.ts";

// Typing for API response data
interface KrakenApiResponse {
  error: string[];
  result: any;
}

// Service to handle communication with Kraken API
export const callKrakenApi = async (
  apiUrl: string, 
  options: RequestInit,
  retryCount = 0
): Promise<{ data: KrakenApiResponse; status: number }> => {
  console.log(`Sending request to: ${apiUrl}`);
  
  // Check for demo mode flag in the body data
  let isDemoMode = false;
  if (options.body && typeof options.body === 'string') {
    try {
      const params = new URLSearchParams(options.body);
      isDemoMode = params.get('forceDemoMode') === 'true';
      
      // Remove the forceDemoMode parameter before sending to Kraken
      if (isDemoMode) {
        params.delete('forceDemoMode');
        options.body = params.toString();
      }
    } catch (e) {
      console.error('Error parsing request body:', e);
    }
  }
  
  // Return mock data in demo mode
  if (isDemoMode || DEMO_MODE_CONFIG.enabled) {
    console.log('Using demo mode, returning mock data');
    return getMockResponse(apiUrl);
  }
  
  // Set timeout for the request
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
    console.error(`Request to ${apiUrl} timed out after ${REQUEST_TIMEOUT}ms`);
  }, REQUEST_TIMEOUT);
  
  // Attach the abort signal to the options
  options.signal = controller.signal;
  
  try {
    // Send request to Kraken API with timeout handling
    const response = await fetch(apiUrl, options);
    
    // Clear the timeout
    clearTimeout(timeoutId);
    
    // Check if we need to rate limit/retry due to 429 Too Many Requests
    if (response.status === 429 && retryCount < MAX_RETRIES) {
      console.warn(`Rate limited by Kraken API, retrying in ${RETRY_DELAY}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      
      // Wait for the retry delay
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      
      // Retry the request
      return callKrakenApi(apiUrl, options, retryCount + 1);
    }
    
    // Parse response
    const responseText = await response.text();
    console.log(`Got response from Kraken API with status: ${response.status}`);
    
    // Only log a snippet of the response to avoid excessive logging
    const responsePreview = responseText.length > 200 
      ? `${responseText.substring(0, 200)}...` 
      : responseText;
    console.log(`Response text preview: ${responsePreview}`);
    
    // Parse JSON response
    let responseData: KrakenApiResponse;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error(`Error parsing JSON response: ${e.message}`);
      console.error(`Response received: ${responseText.substring(0, 500)}`);
      throw new Error(`Invalid JSON response from Kraken: ${responseText.substring(0, 100)}...`);
    }
    
    // Add response timestamp for debugging
    responseData.result = responseData.result || {};
    responseData.result._timestamp = new Date().toISOString();
    
    return { data: responseData, status: response.status };
  } catch (error) {
    // Check if it's an abort error (timeout)
    if (error.name === 'AbortError') {
      console.error(`Request to Kraken API timed out after ${REQUEST_TIMEOUT}ms`);
      
      // If we haven't reached max retries, try again
      if (retryCount < MAX_RETRIES) {
        console.log(`Retrying after timeout (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        
        // Wait for the retry delay
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        
        // Retry the request
        return callKrakenApi(apiUrl, options, retryCount + 1);
      }
      
      throw new Error(`Request timed out after ${REQUEST_TIMEOUT / 1000} seconds and ${retryCount} retries`);
    }
    
    // For other network errors
    console.error('Network error sending request to Kraken:', error);
    
    // Provide more detailed error message
    let errorMessage = 'Network error calling Kraken API';
    if (error.message) {
      errorMessage += `: ${error.message}`;
    }
    
    if (error.cause) {
      errorMessage += ` (${error.cause})`;
    }
    
    throw new Error(errorMessage);
  } finally {
    // Ensure timeout is cleared in all cases
    clearTimeout(timeoutId);
  }
};

// Build the full API URL
export const buildApiUrl = (path: string): string => {
  // Sanitize path to ensure proper formatting
  const sanitizedPath = path.startsWith('/') ? path.substring(1) : path;
  
  // Determine if this is a public or private API
  const isPrivatePath = sanitizedPath.startsWith('private/');
  const basePath = isPrivatePath ? `/${API_VERSION}/private/` : `/${API_VERSION}/public/`;
  
  // Extract the endpoint part without the private/ or public/ prefix
  const endpoint = isPrivatePath 
    ? sanitizedPath.substring(8) // remove 'private/'
    : sanitizedPath.startsWith('public/') 
      ? sanitizedPath.substring(7) // remove 'public/'
      : sanitizedPath;
  
  return `${API_URL}${basePath}${endpoint}`;
};

// Map Kraken errors to appropriate HTTP status codes
export const mapErrorToStatusCode = (errorMsg: string): number => {
  if (!errorMsg) {
    return 500; // Default to 500 for empty error messages
  }
  
  // Authentication errors
  if (errorMsg.includes('Invalid key') || 
      errorMsg.includes('Invalid signature') || 
      errorMsg.includes('Invalid nonce') || 
      errorMsg.includes('Permission denied') ||
      errorMsg.includes('Invalid credentials')) {
    return 403; // Forbidden / authentication error
  } 
  // Rate limiting
  else if (errorMsg.includes('Rate limit exceeded')) {
    return 429; // Too many requests
  } 
  // Bad requests
  else if (errorMsg.includes('Unknown asset pair') || 
           errorMsg.includes('Invalid arguments') ||
           errorMsg.includes('Invalid order') ||
           errorMsg.includes('Unknown order')) {
    return 400; // Bad request
  } 
  // Service issues
  else if (errorMsg.includes('Service unavailable') ||
           errorMsg.includes('Temporary service issue')) {
    return 503; // Service unavailable
  }
  // Timeout issues
  else if (errorMsg.includes('timed out') ||
           errorMsg.includes('timeout')) {
    return 504; // Gateway timeout
  }
  
  // Default to 500 for unknown errors
  return 500;
};

// Utility function to validate API response
export const validateApiResponse = (data: any): boolean => {
  // Check if the data has the expected Kraken API format
  if (!data) {
    return false;
  }
  
  // All valid Kraken responses should have a 'result' property
  // Even if there's an error, it should have an 'error' array
  if (!('result' in data) && (!('error' in data) || !Array.isArray(data.error))) {
    return false;
  }
  
  return true;
};

// Generate mock responses for demo mode
const getMockResponse = async (apiUrl: string): Promise<{ data: KrakenApiResponse; status: number }> => {
  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, DEMO_MODE_CONFIG.defaultLatency));
  
  // Default mock response
  let mockData: KrakenApiResponse = {
    error: [],
    result: {
      _demo: true,
      _timestamp: new Date().toISOString()
    }
  };
  
  // Create different responses based on the API endpoint
  if (apiUrl.includes('/Time')) {
    // Time endpoint
    mockData.result = {
      ...mockData.result,
      unixtime: Math.floor(Date.now() / 1000),
      rfc1123: new Date().toUTCString()
    };
  }
  else if (apiUrl.includes('/Balance')) {
    // Balance endpoint
    mockData.result = {
      ...mockData.result,
      ZUSD: DEMO_MODE_CONFIG.balances.USD.toString(),
      XXBT: DEMO_MODE_CONFIG.balances.BTC.toString(),
      XETH: DEMO_MODE_CONFIG.balances.ETH.toString()
    };
  }
  else if (apiUrl.includes('/OpenPositions')) {
    // Open positions endpoint
    mockData.result = {
      ...mockData.result,
      "POSITIONID1": {
        pair: "XXBTZUSD",
        type: "buy",
        vol: "0.1000",
        vol_closed: "0.0000",
        cost: "3500.00",
        fee: "8.75",
        value: "3600.00",
        net: "+100.00",  // $100 profit
        margin: "1000.00",
        leverage: "3:1"
      }
    };
  }
  else if (apiUrl.includes('/TradesHistory')) {
    // Trade history endpoint
    mockData.result = {
      ...mockData.result,
      trades: {
        "TRADEID1": {
          pair: "XXBTZUSD",
          type: "buy",
          ordertype: "market",
          price: "35000.00",
          vol: "0.1000",
          cost: "3500.00",
          fee: "8.75",
          time: Math.floor(Date.now() / 1000) - 86400 // yesterday
        },
        "TRADEID2": {
          pair: "XETHZUSD",
          type: "sell",
          ordertype: "limit",
          price: "2450.00",
          vol: "1.0000",
          cost: "2450.00",
          fee: "6.13",
          time: Math.floor(Date.now() / 1000) - 43200 // 12 hours ago
        }
      },
      count: 2
    };
  }
  else if (apiUrl.includes('/Ticker') && apiUrl.includes('pair=')) {
    // Extract pair from URL or use default
    const urlObj = new URL(apiUrl);
    const pair = urlObj.searchParams.get('pair') || 'XXBTZUSD';
    
    // Ticker endpoint
    mockData.result = {
      ...mockData.result
    };
    
    // Add ticker data for the requested pair
    if (pair.includes('XBT') || pair.includes('BTC')) {
      mockData.result['XXBTZUSD'] = {
        a: ["36750.00000", "1", "1.000"],  // ask
        b: ["36740.00000", "1", "1.000"],  // bid
        c: ["36745.00000", "0.10000000"],  // last trade
        v: ["1000.00000000", "5000.00000000"],  // volume
        p: ["36700.00000", "36650.00000"],  // vwap
        t: [100, 500],  // number of trades
        l: ["36600.00000", "36500.00000"],  // low
        h: ["36800.00000", "36900.00000"],  // high
        o: "36650.00000"  // open
      };
    } 
    else if (pair.includes('ETH')) {
      mockData.result['XETHZUSD'] = {
        a: ["2470.00000", "10", "10.000"],  // ask
        b: ["2465.00000", "10", "10.000"],  // bid
        c: ["2468.00000", "1.00000000"],  // last trade
        v: ["5000.00000000", "25000.00000000"],  // volume
        p: ["2460.00000", "2450.00000"],  // vwap
        t: [500, 2500],  // number of trades
        l: ["2440.00000", "2430.00000"],  // low
        h: ["2490.00000", "2495.00000"],  // high
        o: "2445.00000"  // open
      };
    }
  }
  else if (apiUrl.includes('/AddOrder')) {
    // Order placement endpoint
    mockData.result = {
      ...mockData.result,
      descr: {
        order: "buy 0.1 BTCUSD @ market"
      },
      txid: [`DEMO-${Date.now()}`]
    };
  }
  
  return { data: mockData, status: 200 };
};
