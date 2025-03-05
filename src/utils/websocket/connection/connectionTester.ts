
import { supabase } from '@/integrations/supabase/client';

/**
 * Check if WebSocket connection to Kraken is possible
 * 
 * @returns Promise<boolean> True if WebSocket connection is possible
 */
export const checkWebSocketConnection = async (): Promise<boolean> => {
  try {
    console.log('Testing direct WebSocket connection to Kraken...');
    
    // Try to establish a test WebSocket connection
    const socket = new WebSocket('wss://ws.kraken.com');
    
    return new Promise((resolve) => {
      // Set a timeout in case the connection hangs
      const timeout = setTimeout(() => {
        try {
          socket.close();
        } catch (e) {
          // Ignore error on timeout
        }
        console.log('WebSocket connection test timed out');
        resolve(false);
      }, 5000);
      
      socket.onopen = () => {
        clearTimeout(timeout);
        try {
          socket.close();
        } catch (e) {
          // Ignore error on close
        }
        console.log('Direct WebSocket connection to Kraken is possible');
        resolve(true);
      };
      
      socket.onerror = (error) => {
        clearTimeout(timeout);
        try {
          socket.close();
        } catch (e) {
          // Ignore error on close after error
        }
        console.error('WebSocket connection test failed:', error);
        resolve(false);
      };
    });
  } catch (error) {
    console.error('Error testing WebSocket connection:', error);
    return false;
  }
};

/**
 * Check for CORS restrictions by making a test request to Kraken API
 * 
 * @returns Promise<boolean> True if CORS restrictions are detected
 */
export const checkCorsRestrictions = async (): Promise<boolean> => {
  try {
    console.log('Testing for CORS restrictions...');
    
    // Try a simple fetch to a Kraken public endpoint
    const response = await fetch('https://api.kraken.com/0/public/Time', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      mode: 'cors', // Explicitly request CORS mode
    });
    
    if (response.ok) {
      console.log('No CORS restrictions detected for Kraken API');
      return false; // No CORS restrictions
    } else {
      console.log('CORS test failed with status:', response.status);
      return true; // Likely CORS restrictions
    }
  } catch (error) {
    // Network error or CORS error
    console.error('CORS test error:', error);
    return true; // Assume CORS restrictions
  }
};

/**
 * Test the connectivity to the Kraken Edge Function proxy
 * 
 * @returns Promise<boolean> True if the proxy is available
 */
export const checkProxyFunction = async (): Promise<boolean> => {
  try {
    console.log('Testing Kraken API proxy connection...');
    const startTime = Date.now();
    
    // Add a timeout promise to prevent hanging
    const timeoutPromise = new Promise<{data: null, error: Error}>((resolve) => {
      setTimeout(() => {
        resolve({
          data: null, 
          error: new Error('Proxy health check timed out after 8 seconds')
        });
      }, 8000);
    });
    
    // Actual proxy call with detailed logging
    console.log('Making proxy health check request...');
    const proxyPromise = supabase.functions.invoke('kraken-proxy', {
      body: { 
        path: 'health', 
        method: 'GET', 
        isPrivate: false
      }
    }).then(result => {
      console.log('Proxy health check response:', result);
      return result;
    }).catch(error => {
      console.error('Proxy health check error caught:', error);
      return { data: null, error };
    });
    
    // Race the proxy call against the timeout
    const { data, error } = await Promise.race([proxyPromise, timeoutPromise]);
    
    const proxyLatency = Date.now() - startTime;
    console.log(`Proxy response time: ${proxyLatency}ms`);
    
    if (error) {
      console.error('Proxy health check failed:', error);
      return false;
    }
    
    if (!data || data.error) {
      console.error('Proxy returned error:', data?.error || 'Unknown error');
      return false;
    }
    
    // Successfully received health check response
    console.log('Kraken proxy is available:', data);
    
    // If latency is too high, log a warning but still consider it available
    if (proxyLatency > 5000) {
      console.warn(`Proxy latency is high (${proxyLatency}ms), service may be degraded`);
    }
    
    return true;
  } catch (error) {
    console.error('Error checking proxy function:', error);
    return false;
  }
};
