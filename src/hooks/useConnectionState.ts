import { useState, useEffect, useCallback } from 'react';
import { 
  getConnectionStatus, 
  initializeWebSocket, 
  restartWebSocket, 
  checkKrakenProxyStatus,
  cleanupWebSocketConnection
} from '@/utils/websocketManager';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export const useConnectionState = () => {
  // Connection states
  const [isInitializing, setIsInitializing] = useState(true);
  const [isRestarting, setIsRestarting] = useState(false);
  const [lastConnectionCheck, setLastConnectionCheck] = useState(0);
  const [proxyAvailable, setProxyAvailable] = useState<boolean | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [pingIntervalId, setPingIntervalId] = useState<number | null>(null);
  
  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user?.id) {
        setIsAuthenticated(true);
        setUserId(data.session.user.id);
        console.log(`User is authenticated with ID: ${data.session.user.id}`);
      } else {
        setIsAuthenticated(false);
        setUserId(null);
        console.log('User is not authenticated');
      }
    };
    
    checkAuth();
    
    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user?.id) {
          setIsAuthenticated(true);
          setUserId(session.user.id);
          console.log(`User signed in with ID: ${session.user.id}`);
          
          // When user signs in, try to restart connection to get live data
          await restartConnection();
        } else if (event === 'SIGNED_OUT') {
          setIsAuthenticated(false);
          setUserId(null);
          console.log('User signed out');
        }
      }
    );
    
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);
  
  // First initialization of WebSocket
  useEffect(() => {
    console.log('Initializing WebSocket connection...');
    const socket = initializeWebSocket();
    
    // Check proxy availability on startup
    checkKrakenProxyStatus()
      .then(available => {
        setProxyAvailable(available);
        console.log(`Kraken proxy availability: ${available ? 'AVAILABLE' : 'UNAVAILABLE'}`);
      })
      .catch(error => {
        console.error('Error checking proxy status:', error);
        setProxyAvailable(false);
      })
      .finally(() => {
        setIsInitializing(false);
      });
    
    // Set up a ping interval to keep the connection alive
    const intervalId = window.setInterval(() => {
      const { isConnected } = getConnectionStatus();
      if (!isConnected) {
        console.log('Connection appears to be down, attempting to reconnect...');
        socket.connect().catch(err => {
          console.error('Auto-reconnect failed:', err);
        });
      }
    }, 30000); // Check every 30 seconds
    
    setPingIntervalId(intervalId);
    
    // Use the centralized cleanup function when component unmounts
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      cleanupWebSocketConnection();
    };
  }, []);

  // Periodic connection check with less frequency
  useEffect(() => {
    const connectionCheckInterval = setInterval(() => {
      setLastConnectionCheck(Date.now());
      
      // Update proxy availability every minute
      if (lastConnectionCheck === 0 || Date.now() - lastConnectionCheck > 60000) {
        checkKrakenProxyStatus()
          .then(available => {
            if (available !== proxyAvailable) {
              console.log(`Proxy availability changed: ${available ? 'AVAILABLE' : 'UNAVAILABLE'}`);
              setProxyAvailable(available);
              
              // If proxy becomes available after being unavailable, notify user
              if (available && proxyAvailable === false) {
                toast.success('Kraken API proxy is now available');
              }
            }
          })
          .catch(error => {
            console.error('Error in periodic proxy check:', error);
          });
      }
    }, 10000); // 10 seconds instead of 5 to reduce CPU usage
    
    return () => clearInterval(connectionCheckInterval);
  }, [lastConnectionCheck, proxyAvailable]);

  // Function to restart WebSocket connection
  const restartConnection = useCallback(async (): Promise<void> => {
    try {
      setIsRestarting(true);
      toast.info('Restarting WebSocket connection...');
      
      // First check proxy status to provide accurate feedback
      const available = await checkKrakenProxyStatus();
      setProxyAvailable(available);
      
      if (!available) {
        toast.warning('Kraken API proxy unavailable', {
          description: 'Connection might use demo mode. Check Supabase Edge Functions.',
          duration: 5000
        });
      } else {
        toast.success('Kraken API proxy available', {
          description: 'Connected to Kraken API successfully.',
          duration: 3000 
        });
      }
      
      // Restart the WebSocket connection
      await restartWebSocket();
      toast.success('WebSocket connection restarted');
    } catch (error) {
      console.error('Error restarting WebSocket connection:', error);
      toast.error('Failed to restart WebSocket connection', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsRestarting(false);
    }
  }, []);

  // Get the true connection status including demo mode
  const { isConnected: wsConnected, isDemoMode } = getConnectionStatus();
  
  // Determine if we can use authenticated endpoints
  const canUseAuthenticatedEndpoints = isAuthenticated && userId !== null && proxyAvailable === true;
  
  return {
    isInitializing,
    isRestarting,
    lastConnectionCheck,
    restartConnection,
    wsConnected,
    isDemoMode,
    proxyAvailable,
    isAuthenticated,
    userId,
    canUseAuthenticatedEndpoints
  };
};
