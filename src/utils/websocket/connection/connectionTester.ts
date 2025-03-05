
import { supabase } from '@/integrations/supabase/client';

/**
 * Test the connectivity to the Kraken Edge Function proxy
 * 
 * @returns Promise<boolean> True if the proxy is available
 */
export const checkProxyFunction = async (): Promise<boolean> => {
  try {
    console.log('Testing Kraken API proxy connection...');
    
    // Call the health endpoint of our Kraken proxy function
    const response = await supabase.functions.invoke('kraken-proxy', {
      body: { 
        path: 'health', 
        method: 'GET', 
        isPrivate: false,
        health: 'check'
      }
    });
    
    if (response.error) {
      console.error('Proxy health check failed:', response.error);
      return false;
    }
    
    if (!response.data || response.data.error) {
      console.error('Proxy returned error:', response.data?.error || 'Unknown error');
      return false;
    }
    
    // Successfully received health check response
    console.log('Kraken proxy is available:', response.data);
    return true;
  } catch (error) {
    console.error('Error checking proxy function:', error);
    return false;
  }
};
