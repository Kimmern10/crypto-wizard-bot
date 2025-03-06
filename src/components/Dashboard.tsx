
import React, { useEffect, useState } from 'react';
import { useTradingContext } from '@/hooks/useTradingContext';
import { toast } from "sonner";
import DashboardLayout from './dashboard/DashboardLayout';
import { Loader2, LogIn } from 'lucide-react';
import { useConnectionState } from '@/hooks/useConnectionState';
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';
import ApiKeyModal from './ApiKeyModal';

const Dashboard: React.FC = () => {
  const { 
    currentBalance, 
    activePositions, 
    isConnected, 
    connectionStatus, 
    lastConnectionEvent, 
    lastTickerData,
    apiKey,
    isApiConfigured,
    isApiKeyModalOpen,
    refreshData,
    restartConnection,
    isLoading,
    isRefreshing,
    lastDataRefresh,
    error,
    dailyChangePercent,
    showApiKeyModal
  } = useTradingContext();
  
  const { 
    isInitializing, 
    isRestarting, 
    wsConnected, 
    isDemoMode, 
    proxyAvailable,
    isAuthenticated,
    canUseAuthenticatedEndpoints
  } = useConnectionState();
  
  const [isDemo, setIsDemo] = useState(false);
  const [corsBlocked, setCorsBlocked] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [attemptingReconnect, setAttemptingReconnect] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  useEffect(() => {
    const checkAuthStatus = async () => {
      const { data } = await supabase.auth.getSession();
      setShowAuthPrompt(!data.session);
    };
    
    checkAuthStatus();
  }, []);

  const btcPrice = lastTickerData['XBT/USD']?.c?.[0] ? parseFloat(lastTickerData['XBT/USD'].c[0]) : 36750;
  const ethPrice = lastTickerData['ETH/USD']?.c?.[0] ? parseFloat(lastTickerData['ETH/USD'].c[0]) : 2470;
  
  const totalBalanceUSD = (
    (currentBalance.USD || 0) + 
    ((currentBalance.BTC || 0) * btcPrice) + 
    ((currentBalance.ETH || 0) * ethPrice)
  );

  const formattedLastRefresh = lastDataRefresh 
    ? (lastDataRefresh instanceof Date ? lastDataRefresh.toLocaleTimeString() : 'Unknown format')
    : 'Never';

  useEffect(() => {
    if (isDemoMode || connectionStatus.toLowerCase().includes('demo')) {
      setIsDemo(true);
    } else {
      setIsDemo(false);
    }
    
    if (
      connectionStatus.toLowerCase().includes('cors') || 
      (proxyAvailable === false && !isConnected)
    ) {
      setCorsBlocked(true);
      setIsDemo(true);
    } else {
      setCorsBlocked(false);
    }
  }, [lastTickerData, connectionStatus, isDemoMode, isConnected, proxyAvailable]);
  
  useEffect(() => {
    console.log('Dashboard detected connection status:', isConnected ? 'Connected' : 'Disconnected');
    console.log('API configuration status:', isApiConfigured ? 'Configured' : 'Not configured');
    console.log('Current connection status:', connectionStatus);
    console.log('WebSocket connected:', wsConnected ? 'Yes' : 'No');
    console.log('Demo mode:', isDemoMode ? 'Yes' : 'No');
    console.log('Proxy available:', proxyAvailable === null ? 'Unknown' : proxyAvailable ? 'Yes' : 'No');
    console.log('User authenticated:', isAuthenticated ? 'Yes' : 'No');
    console.log('Can use authenticated endpoints:', canUseAuthenticatedEndpoints ? 'Yes' : 'No');
    console.log('API Key Modal open status:', isApiKeyModalOpen ? 'Open' : 'Closed');
    
    if (isApiConfigured && apiKey) {
      console.log('API key is present, first 4 characters:', apiKey.substring(0, 4) + '...');
    }
  }, [
    isConnected, 
    isApiConfigured, 
    connectionStatus, 
    apiKey, 
    wsConnected, 
    isDemoMode, 
    proxyAvailable,
    isAuthenticated,
    canUseAuthenticatedEndpoints,
    isApiKeyModalOpen
  ]);

  const handleRefresh = () => {
    console.log('Manually refreshing data...');
    setRefreshing(true);
    
    refreshData()
      .then(() => {
        toast.success('Data refreshed successfully');
      })
      .catch((error) => {
        console.error('Error refreshing data:', error);
        toast.error('Failed to refresh data', {
          description: error instanceof Error ? error.message : 'Unknown error'
        });
      })
      .finally(() => {
        setRefreshing(false);
      });
  };
  
  const handleReconnect = () => {
    console.log('Manually restarting connection...');
    setAttemptingReconnect(true);
    
    restartConnection()
      .then(() => {
        toast.success('Connection restarted successfully');
        return refreshData();
      })
      .then(() => {
        toast.success('Data refreshed after reconnection');
      })
      .catch((error) => {
        console.error('Error restarting connection:', error);
        toast.error('Failed to restart connection', {
          description: error instanceof Error ? error.message : 'Unknown error'
        });
      })
      .finally(() => {
        setAttemptingReconnect(false);
      });
  };
  
  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google'
    });
    
    if (error) {
      toast.error('Login failed', {
        description: error.message
      });
      console.error('Login error:', error);
    }
  };
  
  const handleConfigureApi = () => {
    console.log('Opening API Key configuration modal...');
    showApiKeyModal();
  };
  
  if (showAuthPrompt && !isAuthenticated && !isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground mb-6">
            You need to sign in to access full trading features.
            <br />
            Demo mode with simulated data is available without login.
          </p>
          
          <div className="flex flex-col space-y-4">
            <Button
              onClick={handleLogin}
              className="flex items-center justify-center"
              size="lg"
            >
              <LogIn className="mr-2 h-4 w-4" />
              Sign in with Google
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowAuthPrompt(false)}
              className="mt-2"
            >
              Continue in Demo Mode
            </Button>
          </div>
        </div>
        
        <div className="text-sm text-muted-foreground mt-4 max-w-md text-center">
          <p>
            Demo mode provides simulated market data and trading functionality 
            for testing. Sign in for real-time data and actual trading capabilities.
          </p>
        </div>
      </div>
    );
  }

  if ((isLoading && !isRefreshing && !refreshing && !attemptingReconnect) || isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground text-sm">
          {isInitializing ? 'Initializing connection...' : 'Loading dashboard data...'}
        </p>
        {error && (
          <p className="text-destructive text-xs mt-2">{error}</p>
        )}
      </div>
    );
  }

  return (
    <>
      <DashboardLayout
        isConnected={isConnected || wsConnected}
        isDemo={isDemo}
        isAuthenticated={isAuthenticated}
        corsBlocked={corsBlocked}
        connectionStatus={connectionStatus}
        lastConnectionEvent={lastConnectionEvent}
        activePositions={activePositions}
        lastTickerData={lastTickerData}
        totalBalanceUSD={totalBalanceUSD}
        dailyChangePercent={dailyChangePercent}
        refreshing={refreshing || isRefreshing || isRestarting}
        attemptingReconnect={attemptingReconnect}
        onRefresh={handleRefresh}
        onReconnect={handleReconnect}
        onLogin={handleLogin}
        onConfigureApi={handleConfigureApi}
        lastDataRefresh={formattedLastRefresh}
        error={error}
      />
      
      <ApiKeyModal />
    </>
  );
};

export default Dashboard;
