
import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  KrakenApiConfig, 
  KrakenApiResponse,
  KrakenTimeResponse,
  ErrorDetails
} from '@/types/krakenApiTypes';
import { useKrakenBalance } from './useKrakenBalance';
import { useKrakenPositions } from './useKrakenPositions';
import { useKrakenTradeHistory } from './useKrakenTradeHistory';
import { useKrakenOrders } from './useKrakenOrders';
import { useKrakenWebSocket } from './useKrakenWebSocket';
import { krakenRequest, clearApiCache } from '@/utils/kraken/krakenApiUtils';
import { getConnectionStatus } from '@/utils/websocketManager';

export const useKrakenApi = (config: KrakenApiConfig): KrakenApiResponse => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ErrorDetails | null>(null);
  const [data, setData] = useState<any>(null);
  const [corsRestricted, setCorsRestricted] = useState(false);
  const [useProxyApi, setUseProxyApi] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [lastSuccessfulApiCall, setLastSuccessfulApiCall] = useState<number | null>(null);
  
  // Use ref for tracking connection attempts to prevent duplicates
  const connectionAttemptRef = useRef<boolean>(false);
  
  // Get WebSocket connection status to use as fallback
  const { isConnected: wsConnected, isDemoMode } = getConnectionStatus();
  
  const { fetchBalance } = useKrakenBalance(isConnected || isDemoMode, userId, useProxyApi);
  const { fetchOpenPositions } = useKrakenPositions(isConnected || isDemoMode, userId, useProxyApi);
  const { fetchTradeHistory } = useKrakenTradeHistory(isConnected || isDemoMode, userId, useProxyApi);
  const { sendOrder } = useKrakenOrders(isConnected || isDemoMode, corsRestricted, userId, useProxyApi);
  const { subscribeToTicker, unsubscribeFromTicker } = useKrakenWebSocket();
  
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user?.id) {
        setUserId(data.session.user.id);
      }
    };
    
    checkSession();
    setUseProxyApi(true);
    
    // If we're in demo mode, we should still allow API operations
    if (isDemoMode && !isConnected) {
      console.log('In demo mode - enabling API operations with demo data');
      setIsConnected(true);
    }
  }, [isDemoMode, isConnected]);
  
  // Add automatic reconnection attempts with backoff
  useEffect(() => {
    // If we have a userId but aren't connected, try to connect automatically
    if (userId && !isConnected && !isLoading && !isDemoMode && !connectionAttemptRef.current) {
      console.log('User is logged in but API not connected. Attempting automatic connection...');
      
      // Set connection attempt flag to prevent multiple simultaneous attempts
      connectionAttemptRef.current = true;
      
      // Add a small delay before attempting connection to avoid race conditions
      const timeout = setTimeout(() => {
        connect().catch(err => {
          console.warn('Automatic connection attempt failed:', err.message);
          connectionAttemptRef.current = false;
        });
      }, 1000);
      
      return () => clearTimeout(timeout);
    }
  }, [userId, isConnected, isLoading, isDemoMode]);
  
  // Clear error after a timeout
  useEffect(() => {
    if (error) {
      const timeout = setTimeout(() => {
        setError(null);
        setErrorDetails(null);
      }, 30000); // Clear error after 30 seconds
      
      return () => clearTimeout(timeout);
    }
  }, [error]);
  
  // Periodically check connection health if connected
  useEffect(() => {
    if (!isConnected && !isDemoMode) return;
    
    const healthCheckInterval = setInterval(async () => {
      try {
        // Only do a lightweight check to see if the connection is still valid
        const timeNow = Date.now();
        const timeSinceLastSuccess = lastSuccessfulApiCall ? timeNow - lastSuccessfulApiCall : null;
        
        // If we've had a successful call in the last 2 minutes, skip the health check
        if (timeSinceLastSuccess && timeSinceLastSuccess < 120000) {
          return;
        }
        
        console.log('Performing API health check...');
        const serverTime = await krakenRequest<KrakenTimeResponse>(
          'public/Time', 
          userId, 
          useProxyApi, 
          false, 
          'GET'
        );
        
        // If we got a successful response, update the last successful call timestamp
        if (serverTime && serverTime.result) {
          setLastSuccessfulApiCall(Date.now());
          if (error) {
            setError(null);
            setErrorDetails(null);
          }
        }
      } catch (err) {
        console.warn('API health check failed:', err instanceof Error ? err.message : String(err));
        
        // Only set the connection to failed if we've consistently failed multiple times
        if (isConnected && !isDemoMode && 
            (!lastSuccessfulApiCall || Date.now() - lastSuccessfulApiCall > 300000)) {
          setIsConnected(false);
          const errorMessage = err instanceof Error ? err.message : String(err);
          setError('API connection lost. Try reconnecting.');
          setErrorDetails({
            code: 'CONNECTION_LOST',
            message: errorMessage,
            timestamp: new Date().toISOString()
          });
          toast.error('Kraken API connection lost. Try reconnecting.');
        }
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(healthCheckInterval);
  }, [isConnected, isDemoMode, userId, useProxyApi, lastSuccessfulApiCall, error]);
  
  const connect = useCallback(async () => {
    // Reset connection attempt flag at the beginning
    connectionAttemptRef.current = true;
    
    try {
      // If in demo mode, we're already "connected"
      if (isDemoMode) {
        setIsConnected(true);
        connectionAttemptRef.current = false;
        return;
      }
      
      if ((!config.apiKey || !config.apiSecret) && !userId) {
        setError('API credentials or user authentication required');
        setErrorDetails({
          code: 'CREDENTIALS_MISSING',
          message: 'API credentials or user authentication required',
          timestamp: new Date().toISOString()
        });
        connectionAttemptRef.current = false;
        return;
      }
      
      setIsLoading(true);
      setError(null);
      setErrorDetails(null);
      
      // Clear any cached data before connecting
      clearApiCache();
      
      try {
        console.log('Attempting to connect to Kraken API via proxy...');
        
        const serverTime = await krakenRequest<KrakenTimeResponse>(
          'public/Time', 
          userId, 
          useProxyApi, 
          false, 
          'GET'
        );
        
        console.log('Kraken server time:', new Date(serverTime.result.unixtime * 1000).toISOString());
        
        setIsConnected(true);
        setLastSuccessfulApiCall(Date.now());
        
        console.log('Connected to Kraken API via Supabase Edge Function');
        toast.success('Connected to Kraken API');
        
        const { data: session } = await supabase.auth.getSession();
        if (session.session) {
          // When successful, fetch trade history in the background
          fetchTradeHistory().then(async (trades) => {
            if (trades && trades.length > 0) {
              await saveTradesToSupabase(trades);
            }
          }).catch(error => {
            console.warn('Background fetch of trade history failed:', error);
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        
        // Check if this is a CORS error
        const isCorsError = 
          errorMessage.includes('CORS') || 
          errorMessage.includes('cross-origin') || 
          errorMessage.includes('Network request failed');
        
        if (isCorsError) {
          setCorsRestricted(true);
          setError('Browser CORS restrictions detected. Using demo mode instead.');
          setErrorDetails({
            code: 'CORS_RESTRICTED',
            message: 'Browser CORS restrictions detected. Using demo mode instead.',
            timestamp: new Date().toISOString()
          });
          toast.warning('Browser restrictions detected', {
            description: 'Using demo mode instead. This is expected in development.'
          });
          
          // In CORS-restricted mode, we'll still enable connection in demo mode
          setIsConnected(true);
        } else {
          setError(`Connection failed: ${errorMessage}`);
          setErrorDetails({
            code: 'CONNECTION_FAILED',
            message: errorMessage,
            timestamp: new Date().toISOString()
          });
          setIsConnected(false);
          toast.error(`Connection failed: ${errorMessage}`);
          throw err;
        }
      }
    } finally {
      setIsLoading(false);
      connectionAttemptRef.current = false;
    }
  }, [config.apiKey, config.apiSecret, userId, useProxyApi, fetchTradeHistory, isDemoMode]);
  
  // Enhanced API response with additional status info
  return {
    isConnected: isConnected || isDemoMode, // Consider connected if in demo mode
    isLoading,
    error,
    errorDetails,
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

// Helper function moved from the original file
import { saveTradesToSupabase } from '@/utils/tradeHistoryDb';
