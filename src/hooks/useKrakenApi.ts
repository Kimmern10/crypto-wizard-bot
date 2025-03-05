
import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getConnectionStatus } from '@/utils/websocketManager';
import { krakenRequest, clearApiCache } from '@/utils/kraken/krakenApiUtils';
import type { 
  KrakenApiConfig, 
  KrakenApiResponse,
  KrakenTimeResponse,
  KrakenBalanceResponse,
  KrakenPositionsResponse,
  KrakenTradesResponse,
  OrderParams
} from '@/types/krakenApiTypes';

// Import processing utilities
import { 
  processBalanceData, 
  processPositionsData, 
  processTradesData 
} from '@/utils/kraken/krakenApiUtils';

/**
 * Primary hook for interacting with the Kraken API
 * Handles both direct API calls and WebSocket data integration
 */
export const useKrakenApi = (config: KrakenApiConfig): KrakenApiResponse => {
  // Connection and loading states
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastConnectionAttempt, setLastConnectionAttempt] = useState<number | null>(null);
  const [lastSuccessfulApiCall, setLastSuccessfulApiCall] = useState<number | null>(null);
  
  // User authentication
  const [userId, setUserId] = useState<string | null>(null);
  
  // Connection attempt in progress reference
  const connectionInProgress = useRef(false);
  
  // Get WebSocket connection status to use as fallback
  const { isConnected: wsConnected, isDemoMode } = getConnectionStatus();

  // Check if we're connected to Supabase
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user?.id) {
          setUserId(data.session.user.id);
          console.log('User authenticated with Supabase:', data.session.user.id);
        } else {
          console.log('No authenticated user found');
          setUserId(null);
        }
      } catch (error) {
        console.error('Error checking Supabase session:', error);
        setUserId(null);
      }
    };
    
    checkSession();
    
    // If we're in demo mode, we should still allow API operations
    if (isDemoMode && !isConnected) {
      console.log('In demo mode - enabling API operations with demo data');
      setIsConnected(true);
    }
    
    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user?.id) {
          setUserId(session.user.id);
          console.log('User signed in:', session.user.id);
          
          // Attempt to connect with new user ID
          if (!connectionInProgress.current) {
            connect().catch(err => {
              console.warn('Auto-connection on sign-in failed:', err.message);
            });
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          setUserId(null);
          
          // Clear any cached data
          clearApiCache();
          
          // Set to demo mode on sign out
          if (!isDemoMode) {
            console.log('Switching to demo mode after sign out');
            setIsConnected(true);
          }
        }
      }
    );
    
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [isDemoMode, isConnected]);
  
  // Function to establish connection to Kraken API
  const connect = useCallback(async () => {
    // Avoid multiple connection attempts in quick succession
    if (connectionInProgress.current) {
      console.log('Connection attempt already in progress, skipping');
      return;
    }
    
    if (lastConnectionAttempt && Date.now() - lastConnectionAttempt < 5000) {
      console.log('Ignoring connection request - too soon after last attempt');
      return;
    }
    
    connectionInProgress.current = true;
    setLastConnectionAttempt(Date.now());
    
    try {
      // If in demo mode, we're already "connected"
      if (isDemoMode) {
        console.log('In demo mode, considering connected');
        setIsConnected(true);
        return;
      }
      
      // Check for required authentication
      if ((!config.apiKey || !config.apiSecret) && !userId) {
        console.log('No API credentials or user authentication available');
        setError('API credentials or user authentication required');
        
        // Still allow operation in demo mode
        setIsConnected(true);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      console.log('Attempting to connect to Kraken API via proxy...');
      
      // Perform a simple API test call to verify connection
      const serverTime = await krakenRequest<KrakenTimeResponse>(
        'public/Time', 
        userId, 
        true, // useProxyApi 
        false, // isPrivate
        'GET'
      );
      
      console.log('Kraken server time:', new Date(serverTime.result.unixtime * 1000).toISOString());
      
      setIsConnected(true);
      setLastSuccessfulApiCall(Date.now());
      setError(null);
      
      toast.success('Connected to Kraken API');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Connection attempt failed:', errorMessage);
      setError(`Connection failed: ${errorMessage}`);
      
      // Check if this is a CORS error
      if (errorMessage.includes('CORS') || errorMessage.includes('cross-origin')) {
        console.log('CORS restrictions detected, using demo mode');
        toast.warning('Browser CORS restrictions detected', {
          description: 'Using demo mode instead. This is expected in development.'
        });
        
        // In CORS-restricted mode, we'll still enable connection in demo mode
        setIsConnected(true);
      } else if (!isDemoMode) {
        // For non-CORS errors, warn the user but still allow them to use demo mode
        toast.error(`Connection failed: ${errorMessage}`, {
          description: 'Falling back to demo mode'
        });
        setIsConnected(true);
      }
    } finally {
      setIsLoading(false);
      connectionInProgress.current = false;
    }
  }, [config.apiKey, config.apiSecret, userId, isDemoMode]);
  
  // Helper function to safely execute API requests with proper error handling
  const safeApiRequest = async <T>(
    endpoint: string, 
    isPrivate: boolean = true,
    method: 'GET' | 'POST' = 'POST',
    data: any = {}
  ): Promise<T> => {
    // If not connected and not in demo mode, still allow the operation but use demo data
    if (!isConnected && !isDemoMode) {
      console.log(`Not connected, using demo mode for request to ${endpoint}`);
      return krakenRequest<T>(
        endpoint,
        null,
        true,
        isPrivate,
        method,
        {...data, forceDemoMode: true}
      );
    }
    
    try {
      const result = await krakenRequest<T>(
        endpoint,
        userId,
        true, // useProxyApi
        isPrivate,
        method,
        isDemoMode ? {...data, forceDemoMode: true} : data
      );
      
      setLastSuccessfulApiCall(Date.now());
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`Error in API request to ${endpoint}:`, errorMessage);
      
      // For authentication errors, try to use demo data
      if (errorMessage.includes('authentication') || errorMessage.includes('API credentials')) {
        console.log(`Authentication issue, falling back to demo data for ${endpoint}`);
        return krakenRequest<T>(
          endpoint,
          null,
          true,
          isPrivate,
          method,
          {...data, forceDemoMode: true}
        );
      }
      
      throw err;
    }
  };
  
  // Fetch account balance data
  const fetchBalance = useCallback(async () => {
    try {
      console.log('Fetching account balance...');
      const balanceData = await safeApiRequest<KrakenBalanceResponse>('private/Balance');
      return processBalanceData(balanceData);
    } catch (err) {
      console.error('Cannot fetch balance:', err);
      // Return default data on error
      return { USD: 0, BTC: 0, ETH: 0 };
    }
  }, [isConnected, isDemoMode]);
  
  // Fetch open positions data
  const fetchOpenPositions = useCallback(async () => {
    try {
      console.log('Fetching open positions...');
      const positionsData = await safeApiRequest<KrakenPositionsResponse>('private/OpenPositions');
      return processPositionsData(positionsData);
    } catch (err) {
      console.error('Cannot fetch positions:', err);
      return [];
    }
  }, [isConnected, isDemoMode]);
  
  // Fetch trade history data
  const fetchTradeHistory = useCallback(async () => {
    try {
      console.log('Fetching trade history...');
      const tradesData = await safeApiRequest<KrakenTradesResponse>('private/TradesHistory');
      return processTradesData(tradesData);
    } catch (err) {
      console.error('Cannot fetch trade history:', err);
      return [];
    }
  }, [isConnected, isDemoMode]);
  
  // Send an order to Kraken
  const sendOrder = useCallback(async (params: OrderParams) => {
    if (isDemoMode) {
      console.log('In demo mode, simulating order:', params);
      // Simulate a successful order in demo mode
      toast.success('Demo order submitted', {
        description: `${params.type.toUpperCase()} ${params.volume} ${params.pair} at ${params.price || 'market price'}`
      });
      return {
        result: {
          descr: { order: `Demo ${params.type} order for ${params.volume} ${params.pair}` },
          txid: [`DEMO-${Date.now()}`]
        }
      };
    }
    
    try {
      console.log('Sending order:', params);
      return await safeApiRequest('private/AddOrder', true, 'POST', params);
    } catch (err) {
      console.error('Failed to send order:', err);
      throw err;
    }
  }, [isConnected, isDemoMode]);
  
  // WebSocket integration functions
  const subscribeToTicker = useCallback((pair: string) => {
    console.log(`Subscribing to ticker for ${pair}`);
    // This would need to use the WebSocket manager to subscribe
  }, []);
  
  const unsubscribeFromTicker = useCallback((pair: string) => {
    console.log(`Unsubscribing from ticker for ${pair}`);
    // This would need to use the WebSocket manager to unsubscribe
  }, []);
  
  // Automatically attempt connection if credentials are available
  useEffect(() => {
    if ((config.apiKey && config.apiSecret) || userId) {
      if (!isConnected && !isLoading && !isDemoMode && !connectionInProgress.current) {
        console.log('Credentials available, attempting automatic connection');
        connect().catch(err => {
          console.warn('Auto-connection failed:', err.message);
        });
      }
    }
  }, [config.apiKey, config.apiSecret, userId, connect, isConnected, isLoading, isDemoMode]);
  
  // Create a health check effect that periodically validates the connection
  useEffect(() => {
    if (!isConnected && !isDemoMode) return;
    
    const healthCheckInterval = setInterval(async () => {
      // Only check if we haven't had a successful call recently
      if (lastSuccessfulApiCall && Date.now() - lastSuccessfulApiCall < 60000) {
        return; // Skip if we had a successful call in the last minute
      }
      
      try {
        console.log('Performing API health check...');
        await safeApiRequest<KrakenTimeResponse>('public/Time', false, 'GET');
      } catch (err) {
        console.warn('API health check failed:', err instanceof Error ? err.message : String(err));
      }
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(healthCheckInterval);
  }, [isConnected, isDemoMode, lastSuccessfulApiCall]);
  
  // Return the API interface
  return {
    isConnected: isConnected || isDemoMode, // Consider connected if in demo mode
    isLoading,
    error,
    errorDetails: null, // Simplified for this implementation
    data: null, // Simplified for this implementation
    connect,
    sendOrder,
    fetchBalance,
    fetchOpenPositions,
    fetchTradeHistory,
    subscribeToTicker,
    unsubscribeFromTicker
  };
};
