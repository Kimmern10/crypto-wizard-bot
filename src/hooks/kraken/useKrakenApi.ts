
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  KrakenApiConfig, 
  KrakenApiResponse,
  KrakenTimeResponse
} from '@/types/krakenApiTypes';
import { useKrakenBalance } from './useKrakenBalance';
import { useKrakenPositions } from './useKrakenPositions';
import { useKrakenTradeHistory } from './useKrakenTradeHistory';
import { useKrakenOrders } from './useKrakenOrders';
import { useKrakenWebSocket } from './useKrakenWebSocket';
import { krakenRequest } from '@/utils/kraken/krakenApiUtils';
import { getConnectionStatus } from '@/utils/websocketManager';

export const useKrakenApi = (config: KrakenApiConfig): KrakenApiResponse => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [corsRestricted, setCorsRestricted] = useState(false);
  const [useProxyApi, setUseProxyApi] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [lastSuccessfulApiCall, setLastSuccessfulApiCall] = useState<number | null>(null);
  
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
  
  // Add automatic reconnection attempts
  useEffect(() => {
    // If we have a userId but aren't connected, try to connect automatically
    if (userId && !isConnected && !isLoading && !isDemoMode) {
      console.log('User is logged in but API not connected. Attempting automatic connection...');
      connect().catch(err => {
        console.warn('Automatic connection attempt failed:', err.message);
      });
    }
  }, [userId, isConnected, isLoading, isDemoMode]);
  
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
        }
      } catch (err) {
        console.warn('API health check failed:', err instanceof Error ? err.message : String(err));
        
        // Only set the connection to failed if we've consistently failed multiple times
        if (isConnected && !isDemoMode && 
            (!lastSuccessfulApiCall || Date.now() - lastSuccessfulApiCall > 300000)) {
          setIsConnected(false);
          setError('API connection lost. Try reconnecting.');
          toast.error('Kraken API connection lost. Try reconnecting.');
        }
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(healthCheckInterval);
  }, [isConnected, isDemoMode, userId, useProxyApi, lastSuccessfulApiCall]);
  
  const connect = useCallback(async () => {
    // If in demo mode, we're already "connected"
    if (isDemoMode) {
      setIsConnected(true);
      return;
    }
    
    if ((!config.apiKey || !config.apiSecret) && !userId) {
      setError('API credentials or user authentication required');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
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
        fetchTradeHistory().then(async (trades) => {
          if (trades && trades.length > 0) {
            await saveTradesToSupabase(trades);
          }
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Connection failed: ${errorMessage}`);
      setIsConnected(false);
      toast.error(`Connection failed: ${errorMessage}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [config.apiKey, config.apiSecret, userId, useProxyApi, fetchTradeHistory, isDemoMode]);
  
  // Enhanced API response with additional status info
  return {
    isConnected: isConnected || isDemoMode, // Consider connected if in demo mode
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

// Helper function moved from the original file
import { saveTradesToSupabase } from '@/utils/tradeHistoryDb';
